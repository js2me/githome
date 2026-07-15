import dotenv from "dotenv";

dotenv.config();

export default {
  links: [
    {
      packageName: 'mobx-view-model',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/core/dist`,
      depsPath: '../node_modules',
      additionalDepsToLink: ['react', 'react-dom'],
    },
    {
      packageName: 'mobx-view-model-react',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/react/dist`,
      additionalDepsToLink: ['react', 'react-dom'],
      depsPath: '../node_modules',
    },
    {
      packageName: 'mobx-view-model-devtools',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/devtools/dist`,
      depsPath: '../node_modules',
    },
    {
      packageName: 'mobx-view-model-vite-plugin',
      dirName: `${process.env.PACKALINK_VM_PATH}/packages/vite-plugin/dist`,
      depsPath: '../node_modules',
    },
  ],
};

