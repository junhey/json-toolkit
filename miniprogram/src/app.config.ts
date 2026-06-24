export default {
  pages: [
    'pages/index/index',
    'pages/result/index',
    'pages/about/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3b82f6',
    navigationBarTitleText: 'JSON Toolkit',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f3f4f6',
  },
  tabBar: {
    color: '#6b7280',
    selectedColor: '#3b82f6',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '工具',
      },
      {
        pagePath: 'pages/about/index',
        text: '关于',
      },
    ],
  },
};
