import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMyProfessional } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useI18n } from '../lib/i18n';
import { RequireAuth } from '../components/RequireAuth';
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
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
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
