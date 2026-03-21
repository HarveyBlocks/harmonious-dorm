import { NoticePopup } from '@/components/dorm-hub/notice-popup';
import { SideNav } from '@/components/dorm-hub/side-nav';
import { HubMainContent } from '@/components/dorm-hub/layout/hub-main-content';

export function HubLayout(props: any) {
  const p = props;
  return (
    <div className={`min-h-screen app-shell ${p.themeClass}`}>
      <NoticePopup
        popup={p.noticePopup}
        popupLabel={p.pText.popupNewNotice}
        language={p.me?.language || 'zh-CN'}
        onClose={() => p.setNoticePopup(null)}
      />
      <SideNav
        t={p.t}
        activeTab={p.activeTab}
        unreadNoticeCount={p.unreadNoticeCount}
        avatarPath={p.me?.avatarPath}
        meId={p.meId || 0}
        onNavigate={p.navigateToTab}
      />
      <HubMainContent {...p} />
    </div>
  );
}
