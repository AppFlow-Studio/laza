"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleSchema = z.object({
	role: z.enum(['super_admin', 'admin', 'employee']),
});

export type RoleStepData = z.infer<typeof roleSchema>;

interface RoleStepProps {
	defaultValues?: RoleStepData | null;
	onSubmit: (data: RoleStepData) => void;
}

const ROLES = [
	{
		value: 'employee' as const,
		label: 'Employee',
		description: 'Updates inventory counts at their assigned store location. Cannot manage users or settings.',
		icon: User,
		accent: 'indigo',
		badge: null,
	},
	{
		value: 'admin' as const,
		label: 'Admin',
		description: 'Full control over assigned store locations — employees, inventory, ordering, and reports.',
		icon: Building2,
		accent: 'indigo',
		badge: null,
	},
	{
		value: 'super_admin' as const,
		label: 'Super Admin',
		description: 'Unrestricted access to all stores, the warehouse, all order tickets, analytics, and settings.',
		icon: ShieldCheck,
		accent: 'amber',
		badge: 'Privileged',
	},
] as const;

export default function RoleStep({ defaultValues, onSubmit }: RoleStepProps) {
	const { handleSubmit, watch, setValue } = useForm<RoleStepData>({
		resolver: zodResolver(roleSchema),
		defaultValues: defaultValues || { role: 'employee' },
	});

	const selectedRole = watch('role');

	return (
		<form id="role-step-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div>
				<h2 className="text-base font-semibold text-zinc-900">Select a role</h2>
				<p className="text-sm text-zinc-500 mt-0.5">
					Choose the access level for this team member.
				</p>
			</div>

			<div className="space-y-3">
				{ROLES.map(({ value, label, description, icon: Icon, accent, badge }) => {
					const isSelected = selectedRole === value;
					const isAmber = accent === 'amber';

					return (
						<button
							key={value}
							type="button"
							onClick={() => setValue('role', value)}
							className={cn(
								"w-full p-4 border-2 rounded-xl text-left transition-all group",
								isSelected && isAmber
									? "border-amber-400 bg-amber-50"
									: isSelected
										? "border-indigo-500 bg-indigo-50"
										: "border-zinc-200 hover:border-zinc-300 bg-white"
							)}
						>
							<div className="flex items-start gap-3">
								<div className={cn(
									"p-2 rounded-lg flex-shrink-0 mt-0.5",
									isSelected && isAmber
										? "bg-amber-100"
										: isSelected
											? "bg-indigo-100"
											: "bg-zinc-100 group-hover:bg-zinc-200"
								)}>
									<Icon className={cn(
										"w-4 h-4",
										isSelected && isAmber
											? "text-amber-600"
											: isSelected
												? "text-indigo-600"
												: "text-zinc-500"
									)} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
                                        <span className={cn(
											"text-sm font-semibold",
											isSelected && isAmber
												? "text-amber-900"
												: isSelected
													? "text-indigo-900"
													: "text-zinc-900"
										)}>
                                            {label}
                                        </span>
										{badge && (
											<span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">
                                                {badge}
                                            </span>
										)}
									</div>
									<p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
										{description}
									</p>
								</div>

								{/* Radio indicator */}
								<div className={cn(
									"w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center",
									isSelected && isAmber
										? "border-amber-500"
										: isSelected
											? "border-indigo-500"
											: "border-zinc-300"
								)}>
									{isSelected && (
										<div className={cn(
											"w-2 h-2 rounded-full",
											isAmber ? "bg-amber-500" : "bg-indigo-500"
										)} />
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>

			{selectedRole === 'super_admin' && (
				<div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
					<ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
					<p className="text-xs text-amber-800 leading-relaxed">
						Super Admins have unrestricted system access. This role should only be granted to trusted members of your organization.
					</p>
				</div>
			)}
		</form>
	);
}