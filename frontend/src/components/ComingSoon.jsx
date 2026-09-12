import { motion } from 'framer-motion';

export default function ComingSoon({ icon: Icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="card flex flex-col items-center justify-center px-6 py-20 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-text-2">
        <Icon size={22} />
      </div>
      <h2 className="mt-5 text-base font-semibold tracking-tight text-text">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-2">{description}</p>
      <span className="mt-6 inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-text-2">
        On the roadmap
      </span>
    </motion.div>
  );
}