export default function Flash({ searchParams }) {
  const err = searchParams?.err;
  const ok = searchParams?.ok;
  if (!err && !ok) return null;
  return (
    <div className={err ? 'flash err' : 'flash ok'} role="status">
      {err || ok}
    </div>
  );
}
