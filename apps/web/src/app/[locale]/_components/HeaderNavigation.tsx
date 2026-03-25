'use client';

import { useAuth } from '../_contexts/AuthContext';
import type { NavigationItem } from '../_lib/types';
import { MobileMenu } from './MobileMenu';

type Props = {
  title: string;
  authenticatedItems: NavigationItem[];
  unauthenticatedItems: NavigationItem[];
};

export function HeaderNavigation({ title, authenticatedItems, unauthenticatedItems }: Props) {
  const { user, isLoading } = useAuth();

  // While loading, show unauthenticated menu (less items) to avoid flash
  const items = !isLoading && user ? authenticatedItems : unauthenticatedItems;

  return <MobileMenu title={title} items={items} />;
}
