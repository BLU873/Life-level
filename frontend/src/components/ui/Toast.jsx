import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

export default function Toast({ message, type = 'info', onClose, isVisible }) {
  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className={`
            fixed top-4 right-4 z-[100]
            flex w-80 items-center gap-3 rounded-xl
            border border-line bg-surface p-4 shadow-popover
          `}
        >
          <span className={colors[type]}>
            <Icon size={18} />
          </span>
          <span className="flex-1 text-sm text-text">{message}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-3 transition-colors hover:text-text"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}