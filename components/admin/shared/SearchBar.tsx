"use client";

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useEffect, useState } from 'react';

interface SearchBarProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    debounceMs?: number;
}

export default function SearchBar({ placeholder = "Search...", onSearch, debounceMs = 300 }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, debounceMs);

    useEffect(() => {
        onSearch(debouncedQuery);
    }, [debouncedQuery, onSearch]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <Input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 w-full"
            />
        </div>
    );
}

