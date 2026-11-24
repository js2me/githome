package com.js2me.githome;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import javax.net.ssl.HttpsURLConnection;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String RELEASE_PATH = "/js2me/githome/releases/download/";
    private static final String APK_NAME = "githome-android.apk";
    private static final int MAX_APK_SIZE = 128 * 1024 * 1024;
    private volatile File stagedApk;
    private boolean installerOpen;

    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            call.resolve(new JSObject().put("version", installedPackage(0).versionName));
        } catch (PackageManager.NameNotFoundException error) {
            call.reject("Не удалось получить версию GitHome.");
        }
    }

    @PluginMethod
    public void download(PluginCall call) {
        String tag = call.getString("tag", "");
        String digest = call.getString("digest", "");
        int size = call.getInt("size", 0);
        if (!tag.matches("v?[0-9]{1,9}\\.[0-9]{1,9}\\.[0-9]{1,9}") ||
            !digest.matches("sha256:[a-f0-9]{64}") || size <= 0 || size > MAX_APK_SIZE) {
            call.reject("В релизе указан некорректный APK.");
            return;
        }

        File directory = new File(getContext().getCacheDir(), "app-updates");
        File partial = new File(directory, "githome.partial.apk");
        File apk = new File(directory, APK_NAME);
        stagedApk = null;
        try {
            if (!directory.isDirectory() && !directory.mkdirs()) {
                throw new IOException("Cannot create staging directory");
            }
            URL url = new URL("https://github.com" + RELEASE_PATH + tag + "/" + APK_NAME);
            downloadApk(url, partial, size, digest.substring("sha256:".length()));
            verifyPackage(partial, tag.replaceFirst("^v", ""));
            if (!partial.renameTo(apk)) throw new IOException("Cannot stage APK");
            stagedApk = apk;
            call.resolve();
        } catch (InvalidUpdateException error) {
            call.reject(error.getMessage());
        } catch (Exception error) {
            Log.e("GitHomeUpdater", "Could not download the update", error);
            call.reject("Не удалось скачать обновление. Проверьте соединение и свободное место.");
        } finally {
            partial.delete();
        }
    }

    private void downloadApk(URL url, File destination, int expectedSize, String expectedDigest)
        throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (int redirect = 0; redirect <= 5; redirect++) {
            boolean releaseUrl = url.getHost().equals("github.com") && url.getPath().startsWith(RELEASE_PATH);
            boolean assetUrl = url.getHost().equals("release-assets.githubusercontent.com") ||
                url.getHost().equals("objects.githubusercontent.com");
            if (!url.getProtocol().equals("https") || url.getUserInfo() != null ||
                (url.getPort() != -1 && url.getPort() != 443) || (!releaseUrl && !assetUrl)) {
                throw new IOException("Untrusted release URL");
            }
            HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
            try {
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(20_000);
                int status = connection.getResponseCode();
                String location = connection.getHeaderField("Location");
                if (status >= 300 && status < 400 && location != null) {
                    url = new URL(url, location);
                    continue;
                }
                if (status != 200) throw new IOException("GitHub HTTP " + status);

                int size = 0;
                int lastPercent = 0;
                byte[] buffer = new byte[64 * 1024];
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(destination)) {
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        size += count;
                        if (size > expectedSize) throw new IOException("Invalid APK size");
                        output.write(buffer, 0, count);
                        digest.update(buffer, 0, count);
                        int percent = (int) (100L * size / expectedSize);
                        if (percent > lastPercent) {
                            lastPercent = percent;
                            notifyListeners("progress", new JSObject().put("percent", percent));
                        }
                    }
                }
                StringBuilder hash = new StringBuilder(64);
                for (byte value : digest.digest()) {
                    hash.append(Character.forDigit((value >>> 4) & 0xf, 16));
                    hash.append(Character.forDigit(value & 0xf, 16));
                }
                if (size != expectedSize || !expectedDigest.contentEquals(hash)) {
                    throw new InvalidUpdateException("Не совпали размер или контрольная сумма APK.");
                }
                return;
            } finally {
                connection.disconnect();
            }
        }
        throw new IOException("Too many redirects");
    }

    @SuppressWarnings("deprecation")
    private PackageInfo installedPackage(int flags) throws PackageManager.NameNotFoundException {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), flags);
    }

    @SuppressWarnings("deprecation")
    private void verifyPackage(File apk, String expectedVersion) throws Exception {
        boolean modern = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P;
        int flags = modern ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo installed = installedPackage(flags);
        PackageInfo update = getContext().getPackageManager().getPackageArchiveInfo(apk.getPath(), flags);
        if (update == null || !installed.packageName.equals(update.packageName) ||
            !expectedVersion.equals(update.versionName) ||
            (modern ? update.getLongVersionCode() <= installed.getLongVersionCode()
                    : update.versionCode <= installed.versionCode)) {
            throw new InvalidUpdateException("APK не подходит для обновления установленной версии GitHome.");
        }

        Signature[] current = modern
            ? installed.signingInfo == null ? null : installed.signingInfo.getApkContentsSigners()
            : installed.signatures;
        Signature[] incoming = modern
            ? update.signingInfo == null ? null : update.signingInfo.getApkContentsSigners()
            : update.signatures;
        if (current == null || incoming == null || current.length == 0 ||
            !new HashSet<>(Arrays.asList(current)).equals(new HashSet<>(Arrays.asList(incoming)))) {
            throw new InvalidUpdateException("Подпись APK отличается от подписи установленного GitHome.");
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (installerOpen) {
                call.reject("Установщик уже открыт.");
                return;
            }
            if (stagedApk == null || !stagedApk.isFile()) {
                call.reject("Скачанный APK больше недоступен. Проверьте обновления ещё раз.", "APK_MISSING");
                return;
            }
            installerOpen = true;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                    !getContext().getPackageManager().canRequestPackageInstalls()) {
                    Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.fromParts("package", getContext().getPackageName(), null));
                    startActivityForResult(call, permission, "installPermissionResult");
                } else {
                    openInstaller(call);
                }
            } catch (RuntimeException error) {
                installerOpen = false;
                call.reject("Не удалось открыть установщик Android.");
            }
        });
    }

    @ActivityCallback
    private void installPermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            installerOpen = false;
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !getContext().getPackageManager().canRequestPackageInstalls()) {
            installerOpen = false;
            call.resolve(new JSObject().put("message", "Разрешите GitHome установку приложений в настройках Android."));
            return;
        }
        try {
            openInstaller(call);
        } catch (RuntimeException error) {
            installerOpen = false;
            call.reject("Не удалось открыть установщик Android.");
        }
    }

    @SuppressWarnings("deprecation")
    private void openInstaller(PluginCall call) {
        Uri apk = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", stagedApk);
        Intent installer = new Intent(Intent.ACTION_INSTALL_PACKAGE);
        installer.setData(apk);
        installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        installer.putExtra(Intent.EXTRA_RETURN_RESULT, true);
        startActivityForResult(call, installer, "installerResult");
    }

    @ActivityCallback
    private void installerResult(PluginCall call, ActivityResult result) {
        installerOpen = false;
        if (call != null) {
            if (result.getResultCode() == Activity.RESULT_OK) call.resolve(new JSObject());
            else call.resolve(new JSObject().put("message", "Установка не завершена. Можно попробовать снова."));
        }
    }

    private static class InvalidUpdateException extends Exception {
        InvalidUpdateException(String message) {
            super(message);
        }
    }
}
