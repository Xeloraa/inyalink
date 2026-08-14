import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMyProfessional } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';
import { RequireAuth } from '../features/auth/RequireAuth';
import { JoinWizard } from '../features/professionals/JoinWizard';

function JoinGate() {
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [redirectEdit, setRedirectEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMyProfessional()
      .then((me) => {
        if (cancelled) return;
        if (me.status === 'pending' || me.status === 'approved') {
          setRedirectEdit(true);
        }
      })
      .catch((err) => {
        // 404 = not a professional yet — show the wizard.
        if (!(err instanceof ApiError && err.status === 404) && !cancelled) {
          /* stay on join; wizard can still load categories */
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="mx-auto max-w-[620px] py-3xl" role="status">
        <div className="rounded-xl2 bg-white p-xl text-center shadow-md">
          <p className="text-body text-ink-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (redirectEdit) {
    return <Navigate to="/professionals/me/edit" replace />;
  }

  return <JoinWizard />;
}

export default function ProfessionalsJoin() {
  return (
    <RequireAuth>
      <JoinGate />
    </RequireAuth>
  );
}
