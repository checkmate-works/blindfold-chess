declare module '@emoji-mart/react' {
  interface PickerProps {
    data?: unknown;
    onEmojiSelect?: (emoji: { native: string }) => void;
    theme?: 'auto' | 'light' | 'dark';
    set?: string;
    locale?: string;
    autoFocus?: boolean;
    [key: string]: unknown;
  }

  export default function Picker(props: PickerProps): JSX.Element;
}

declare module '@emoji-mart/data' {
  const data: unknown;
  export default data;
}
