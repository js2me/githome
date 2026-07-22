import dotenv from "dotenv";

dotenv.config();

export default {
  links: [
    process.env.PACKALINK_VM_PATH && {
      packageName: 'mobx-view-model',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/core/dist`,
      depsPath: '../node_modules',
      // НЕ additionalDepsToLink: ['yummies'] —
      // yummies из core всё ещё резолвит свой mobx (pnpm nest),
      // а app/mvm — проектный → dual mobx, observer не видит updates.
    },
    process.env.PACKALINK_VM_PATH && {
      packageName: 'mobx-view-model-react',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/react/dist`,
      depsPath: '../node_modules',
    },
    process.env.PACKALINK_ROUTE_PATH && {
      packageName: 'mobx-route',
      dirName: `${process.env.PACKALINK_ROUTE_PATH}/dist`,
      depsPath: '../node_modules',
    },
    // {
    //   packageName: 'mobx-view-model-devtools',
    //   dirName: `${process.env.PACKALINK_VM_PATH}/packages/devtools/dist`,
    //   depsPath: '../node_modules',
    // },
    // {
    //   packageName: 'mobx-view-model-vite-plugin',
    //   dirName: `${process.env.PACKALINK_VM_PATH}/packages/vite-plugin/dist`,
    //   depsPath: '../node_modules',
    // },
  ].filter(Boolean),
};
