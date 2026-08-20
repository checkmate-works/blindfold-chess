import type { ReactElement } from 'react';

import {
  FaBook,
  FaBookOpen,
  FaBullhorn,
  FaCog,
  FaCoins,
  FaCompass,
  FaDumbbell,
  FaEnvelope,
  FaGraduationCap,
  FaList,
  FaNewspaper,
  FaQuestionCircle,
  FaRocket,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa';
import { GiBlackBelt, GiCrossedSwords } from 'react-icons/gi';

import type { NavigationIconName } from './types';

/**
 * The declared `ReactElement` return type is load-bearing: without it the
 * switch had no `default`, so adding a `NavigationIconName` widened the
 * inferred return to `Element | undefined` with no error (`noImplicitReturns`
 * is off) and that nav item rendered with no icon, misaligned in every menu.
 * With the annotation, a missing case fails the build.
 */
export const getIcon = (iconName: NavigationIconName): ReactElement => {
  switch (iconName) {
    case 'home':
      return <FaList className="h-5 w-5" />;
    case 'games':
      return <GiCrossedSwords className="h-5 w-5" />;
    case 'dashboard':
      return <FaCompass className="h-5 w-5" />;
    case 'articles':
      return <FaNewspaper className="h-5 w-5" />;
    case 'getting-started':
      return <FaRocket className="h-5 w-5" />;
    case 'learn':
      return <FaGraduationCap className="h-5 w-5" />;
    case 'practice':
      return <FaDumbbell className="h-5 w-5" />;
    case 'topics':
      return <FaUsers className="h-5 w-5" />;
    case 'manual':
      return <FaBook className="h-5 w-5" />;
    case 'announcements':
      return <FaBullhorn className="h-5 w-5" />;
    case 'faq':
      return <FaQuestionCircle className="h-5 w-5" />;
    case 'glossary':
      return <FaList className="h-5 w-5" />;
    case 'leaderboard':
      return <FaTrophy className="h-5 w-5" />;
    case 'contact':
      return <FaEnvelope className="h-5 w-5" />;
    case 'settings':
      return <FaCog className="h-5 w-5" />;
    case 'ranks':
      return <GiBlackBelt className="h-5 w-5" />;
    case 'guides':
      return <FaBookOpen className="h-5 w-5" />;
    case 'dojo':
      return <GiBlackBelt className="h-5 w-5" />;
    case 'coin':
      return <FaCoins className="h-5 w-5" />;
  }
};
