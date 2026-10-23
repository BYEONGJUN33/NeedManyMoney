// 앱인토스 설정. appName은 콘솔에 등록한 앱 이름(영문 키)과 같아야 업로드된다.
// 콘솔에서 다른 이름으로 만들었으면 AIT_APP_NAME=<이름> 으로 빌드한다.
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: process.env.AIT_APP_NAME || 'nova-swarm',
  brand: { primaryColor: '#3DF2FF' },
  permissions: [],
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
    mediaPlaybackRequiresUserAction: false,
    allowsBackForwardNavigationGestures: false,
  },
  webBundleDir: 'dist',
});
