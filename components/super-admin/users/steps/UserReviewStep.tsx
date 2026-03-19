"use client";

import { Pencil, User, Building2, ShieldCheck, MapPin, Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Location } from '@/lib/supabase/types';
import type { RoleStepData } from './RoleStep';
import type { LocationStepData } from './LocationStep';
import type { UserDetailsData } from './UserDetailsStep';

interface UserReviewStepProps {
	roleData: RoleStepData;
	locationData: LocationStepData | null;
	userDetails: UserDetailsData;
	onEditStep: (step: number) => void;
}

const ROLE_CONFIG = {
	employee: {
		label: 'Employee',
		icon: User,
		color: 'text-indigo-600 bg-indigo-50',
		description: 'Can update inventory at their assigned location',
	},
	admin: {
		label: 'Store Admin',
		icon: Building2,
		color: 'text-indigo-600 bg-indigo-50',
		description: 'Full control over assigned store locations',
	},
	super_admin: {
		label: 'Super Admin',
		icon: ShieldCheck,
		color: 'text-amber-600 bg-amber-50',
		description: 'Full system access — all stores, warehouse, analytics',
	},
};

function SectionCard({
						 title,
						 step,
						 onEdit,
						 children,
					 }: {
	title: string;
	step: number;
	onEdit: (step: number) => void;
	children: React.ReactNode;
}) {
	return (
		<div className="border border-zinc-200 rounded-xl overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
				<span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{title}</span>
				<button
					type="button"
					onClick={() => onEdit(step)}
					className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
				>
					<Pencil className="w-3 h-3" />
					Edit
				</button>
			</div>
			<div className="px-4 py-3">{children}</div>
		</div>
	);
}

export default function UserReviewStep({
										   roleData,
										   locationData,
										   userDetails,
										   onEditStep,
									   }: UserReviewStepProps) {
	const { data: locations } = useLocations();

	const config = ROLE_CONFIG[roleData.role];
	const RoleIcon = config.icon;

	const getLocationNames = () => {
		if (!locations) return [];
		if (roleData.role === 'employee') {
			const loc = locations.find((l: Location) => l.id === locationData?.assigned_location_id);
			return loc ? [loc.name] : [];
		}
		if (roleData.role === 'admin') {
			const ids = locationData?.assigned_location_ids ?? [];
			if (ids.length === 0) return ['All stores'];
			return locations
				.filter((l: Location) => ids.includes(l.id))
				.map((l: Location) => l.name);
		}
		return ['All stores and warehouse (full access)'];
	};

	const locationNames = getLocationNames();
	const displayName = [userDetails.first_name, userDetails.last_name].filter(Boolean).join(' ');

	return (
		<div className="space-y-3">
			<div>
				<h2 className="text-base font-semibold text-zinc-900">Review & confirm</h2>
				<p className="text-sm text-zinc-500 mt-0.5">
					Make sure everything looks right before sending the invitation.
				</p>
			</div>

			{/* Role */}
			<SectionCard title="Role" step={1} onEdit={onEditStep}>
				<div className="flex items-center gap-3">
					<div className={cn("p-2 rounded-lg", config.color)}>
						<RoleIcon className="w-4 h-4" />
					</div>
					<div>
						<p className="text-sm font-semibold text-zinc-900">{config.label}</p>
						<p className="text-xs text-zinc-500 mt-0.5">{config.description}</p>
					</div>
				</div>
			</SectionCard>

			{/* Access / Location */}
			<SectionCard title="Access" step={2} onEdit={onEditStep}>
				<div className="space-y-1.5">
					{locationNames.map((name) => (
						<div key={name} className="flex items-center gap-2 text-sm text-zinc-700">
							<MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
							{name}
						</div>
					))}
				</div>
			</SectionCard>

			{/* User details */}
			<SectionCard title="User details" step={3} onEdit={onEditStep}>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-zinc-700">
						<Mail className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
						<span className="font-medium">{userDetails.email}</span>
					</div>
					{displayName && (
						<div className="flex items-center gap-2 text-sm text-zinc-500">
							<User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
							{displayName}
						</div>
					)}
				</div>
			</SectionCard>

			{/* Invite summary callout */}
			<div className="flex gap-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
				<Send className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
				<p className="text-xs text-indigo-700 leading-relaxed">
					An invitation email will be sent to{' '}
					<span className="font-semibold">{userDetails.email}</span>. They'll be able to set their password and join the organization.
				</p>
			</div>
		</div>
	);
}