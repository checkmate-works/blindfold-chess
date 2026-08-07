import { AnchorPointsBoard } from './AnchorPointsBoard';

const ALL_ANCHOR_SQUARES = [
  'a8',
  'd8',
  'e8',
  'h8',
  'a5',
  'd5',
  'e5',
  'h5',
  'a4',
  'd4',
  'e4',
  'h4',
  'a1',
  'd1',
  'e1',
  'h1',
];

export function AllAnchorPointsBoard() {
  return <AnchorPointsBoard squares={ALL_ANCHOR_SQUARES} />;
}
