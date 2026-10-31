"use client";

import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useEffect, useState } from "react";

interface SearchBarProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    debounceMs?: number;
}

export default function SearchBar({
    placeholder = "Search...",
    onSearch,
    debounceMs = 300,
}: SearchBarProps) {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, debounceMs);

    useEffect(() => {
        onSearch(debouncedQuery);
    }, [debouncedQuery, onSearch]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
        </div>
    );
}