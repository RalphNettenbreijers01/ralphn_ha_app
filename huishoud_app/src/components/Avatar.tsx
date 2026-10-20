import type { User } from '../types';

interface Props {
  user?: Pick<User, 'avatar' | 'color' | 'name'> | null;
  size?: number;
  className?: string;
}

export const isImageAvatar = (a: string) => a.startsWith('data:');

export default function Avatar({ user, size = 36, className = '' }: Props) {
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.55,
    boxShadow: user ? `0 0 0 2px ${user.color}` : undefined,
    backgroundColor: user ? user.color + '22' : '#e2e8f0',
  };
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full leading-none ${className}`}
      style={style}
      title={user?.name ?? 'Niet toegewezen'}
    >
      {user ? (
        isImageAvatar(user.avatar) ? (
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          user.avatar
        )
      ) : (
        '❔'
      )}
    </span>
  );
}
