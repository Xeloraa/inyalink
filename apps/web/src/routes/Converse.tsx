import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatUi } from '../components/FloatingChat';

/** Legacy /converse URL → home with the floating panel open. */
export default function Converse() {
  const navigate = useNavigate();
  const { setOpen } = useChatUi();

  useEffect(() => {
    setOpen(true);
    void navigate('/', { replace: true });
  }, [navigate, setOpen]);

  return null;
}
