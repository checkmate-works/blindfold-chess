import { ImageSourcePropType } from "react-native";

export interface MentorConfig {
  name: string;
  avatar: ImageSourcePropType;
}

export const MENTOR: MentorConfig = {
  name: "Mentor",
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  avatar: require("../../../../assets/mentor-avatar.png"),
};
