import {
  FaBook,
  FaCog,
  FaDumbbell,
  FaEnvelope,
  FaGraduationCap,
  FaList,
  FaNewspaper,
  FaQuestionCircle,
  FaRocket,
} from 'react-icons/fa';

import type { NavigationIconName } from './types';

export const getIcon = (iconName: NavigationIconName) => {
  switch (iconName) {
    case 'home':
      return null;
    case 'articles':
      return <FaNewspaper className="h-5 w-5" />;
    case 'getting-started':
      return <FaRocket className="h-5 w-5" />;
    case 'learn':
      return <FaGraduationCap className="h-5 w-5" />;
    case 'practice':
      return <FaDumbbell className="h-5 w-5" />;
    case 'manual':
      return <FaBook className="h-5 w-5" />;
    case 'faq':
      return <FaQuestionCircle className="h-5 w-5" />;
    case 'glossary':
      return <FaList className="h-5 w-5" />;
    case 'contact':
      return <FaEnvelope className="h-5 w-5" />;
    case 'settings':
      return <FaCog className="h-5 w-5" />;
  }
};
