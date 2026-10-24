import { defineConfig } from '@apps-in-toss/web-framework/config';

// appName은 콘솔에 등록한 이름과 같아야 업로드된다 (app.json과 맞춘다)
export default defineConfig({
  appName: 'salary-calc',
  brand: { primaryColor: '#3182F6' },
  permissions: [],
  webView: { bounces: false, pullToRefreshEnabled: false, allowsBackForwardNavigationGestures: false },
  webBundleDir: 'dist',
});
