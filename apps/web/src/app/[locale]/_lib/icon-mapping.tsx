import {
  FaBook,
  FaBookOpen,
  FaBullhorn,
  FaCog,
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

export const getIcon = (iconName: NavigationIconName) => {
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
  }
};
