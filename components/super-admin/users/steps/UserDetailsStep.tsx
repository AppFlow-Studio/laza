"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User } from 'lucide-react';

const userDetailsSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
});

export type UserDetailsData = z.infer<typeof userDetailsSchema>;

interface UserDetailsStepProps {
	defaultValues?: UserDetailsData | null;
	onSubmit: (data: UserDetailsData) => void;
}

export default function UserDetailsStep({ defaultValues, onSubmit }: UserDetailsStepProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<UserDetailsData>({
		resolver: zodResolver(userDetailsSchema),
		defaultValues: defaultValues || {
			email: '',
			first_name: '',
			last_name: '',
		},
	});

	return (
		<form id="user-details-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
			<div>
				<h2 className="text-base font-semibold text-zinc-900">User details</h2>
				<p className="text-sm text-zinc-500 mt-0.5">
					An invitation will be sent to this email address.
				</p>
			</div>

			{/* Email */}
			<div className="space-y-1.5">
				<Label htmlFor="email" className="text-sm font-medium text-zinc-700">
					Email address <span className="text-red-500">*</span>
				</Label>
				<div className="relative">
					<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<Input
						id="email"
						type="email"
						{...register('email')}
						placeholder="colleague@example.com"
						className={`pl-9 ${errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
					/>
				</div>
				{errors.email && (
					<p className="text-xs text-red-500">{errors.email.message}</p>
				)}
			</div>

			{/* Name row */}
			<div>
				<Label className="text-sm font-medium text-zinc-700 mb-1.5 block">
					Name <span className="text-zinc-400 font-normal">(optional)</span>
				</Label>
				<div className="grid grid-cols-2 gap-3">
					<div className="relative">
						<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
						<Input
							id="first_name"
							{...register('first_name')}
							placeholder="First name"
							className="pl-9"
						/>
					</div>
					<Input
						id="last_name"
						{...register('last_name')}
						placeholder="Last name"
					/>
				</div>
				<p className="text-xs text-zinc-400 mt-1.5">
					Pre-fills their profile when they accept the invitation.
				</p>
			</div>
		</form>
	);
}