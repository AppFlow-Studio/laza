export function NavBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gray-500 px-1 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
            {count > 99 ? "99+" : count}
        </span>
    );
}