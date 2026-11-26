import AppKit
import Dispatch

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let arguments = CommandLine.arguments
let workspace = NSWorkspace.shared

guard arguments.count >= 3 else { fail("Missing command") }
let command = arguments[1]
let value = arguments[2]

switch command {
case "find":
    guard workspace.urlForApplication(withBundleIdentifier: value) != nil else {
        fail("Browser is not installed")
    }
case "get":
    guard value == "http" || value == "https" else { fail("Invalid scheme") }
    if let url = URL(string: "\(value)://example.invalid"),
       let app = workspace.urlForApplication(toOpen: url),
       let identifier = Bundle(url: app)?.bundleIdentifier {
        print(identifier)
    }
case "set":
    guard arguments.count == 5, value == "http" || value == "https" else {
        fail("Invalid arguments")
    }
    let bundle = arguments[3]
    let application = bundle == "com.js2me.githome"
        ? URL(fileURLWithPath: arguments[4])
        : workspace.urlForApplication(withBundleIdentifier: bundle)
    guard let application else { fail("Browser is not installed") }
    if #available(macOS 12.0, *) {
        workspace.setDefaultApplication(at: application, toOpenURLsWithScheme: value) { error in
            if let error { fail(error.localizedDescription) }
            exit(0)
        }
        dispatchMain()
    } else {
        fail("Changing the browser requires macOS 12 or later")
    }
default:
    fail("Unknown command")
}
