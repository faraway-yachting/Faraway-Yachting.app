interface BadgeProps {
  status: "live" | "beta" | "coming-soon";
}

export function Badge({ status }: BadgeProps) {
  const styles = {
    live: "bg-[#5A7A8F] text-white",
    beta: "bg-orange-500 text-white",
    "coming-soon": "bg-gray-300 text-gray-700",
  };

  const labels = {
    live: "Live",
    beta: "Beta",
    "coming-soon": "Coming Soon",
  };

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
