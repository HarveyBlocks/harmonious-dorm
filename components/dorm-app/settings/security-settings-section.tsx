
import { SettingsSection } from '../settings-section';

export function SecuritySettingsSection(props: {
  t: any;
  folded: boolean;
  toggleLabel: string;
  onToggle: () => void;
  logoutMutation: any;
  deleteAccountMutation: any;
}) {
  const { t, folded, toggleLabel, onToggle, logoutMutation, deleteAccountMutation } = props;

  return (
    <SettingsSection title={t.accountSecurity} folded={folded} onToggle={onToggle} toggleLabel={toggleLabel} className={`glass-card sleep-depth-mid rounded-3xl ${folded ? 'px-7 py-4 md:px-8 md:py-4' : 'p-7 md:p-8'}`}>
      <div className="space-y-5 mt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button onClick={() => { if (typeof window !== 'undefined' && window.confirm(t.logoutConfirm)) { logoutMutation.mutate(); } }} className="glass-card px-4 py-3 rounded-xl font-bold w-full">{t.logout}</button>
          <button onClick={() => { if (typeof window !== 'undefined' && window.confirm(t.deleteAccountConfirm)) { deleteAccountMutation.mutate(); } }} className="glass-card px-4 py-3 rounded-xl font-bold w-full text-rose-500">{t.deleteAccount}</button>
        </div>
        {logoutMutation.error ? <p className="text-rose-500 text-sm">{(logoutMutation.error as Error).message}</p> : null}
        {deleteAccountMutation.error ? <p className="text-rose-500 text-sm">{(deleteAccountMutation.error as Error).message}</p> : null}
      </div>
    </SettingsSection>
  );
}
