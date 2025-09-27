import { FaGraduationCap, FaDumbbell, FaBook, FaQuestionCircle, FaList } from 'react-icons/fa';
import type { NavigationIconName } from './types';

export const getIcon = (iconName: NavigationIconName) => {
  switch (iconName) {
    case 'home':
      return null;
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
  }
};
