import type { RatingFaceLevel, RatingFaceSvgData } from "./types";

const VIEWBOX = "0 0 24 24";
const FACE_FILL = "#9CA3AF";
const DETAIL_COLOR = "#4B5563";

function getFaceLevel1(): RatingFaceSvgData {
  return {
    viewBox: VIEWBOX,
    elements: [
      { type: "circle", cx: "12", cy: "12", r: "10", fill: FACE_FILL },
      {
        type: "path",
        d: "M8.5 10.5 7 9M9.5 9l-1 1.5",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
      },
      {
        type: "path",
        d: "M15.5 10.5 17 9M14.5 9l1 1.5",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
      },
      {
        type: "path",
        d: "M8 17c1.5-2.5 6.5-2.5 8 0",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
        fill: "none",
      },
    ],
  };
}

function getFaceLevel2(): RatingFaceSvgData {
  return {
    viewBox: VIEWBOX,
    elements: [
      { type: "circle", cx: "12", cy: "12", r: "10", fill: FACE_FILL },
      {
        type: "circle",
        cx: "9",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "circle",
        cx: "15",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "path",
        d: "M9 16c1.2-1.5 4.8-1.5 6 0",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
        fill: "none",
      },
    ],
  };
}

function getFaceLevel3(): RatingFaceSvgData {
  return {
    viewBox: VIEWBOX,
    elements: [
      { type: "circle", cx: "12", cy: "12", r: "10", fill: FACE_FILL },
      {
        type: "circle",
        cx: "9",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "circle",
        cx: "15",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "path",
        d: "M9 15h6",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
      },
    ],
  };
}

function getFaceLevel4(): RatingFaceSvgData {
  return {
    viewBox: VIEWBOX,
    elements: [
      { type: "circle", cx: "12", cy: "12", r: "10", fill: FACE_FILL },
      {
        type: "circle",
        cx: "9",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "circle",
        cx: "15",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "path",
        d: "M9 14c1.2 1.5 4.8 1.5 6 0",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
        fill: "none",
      },
    ],
  };
}

function getFaceLevel5(): RatingFaceSvgData {
  return {
    viewBox: VIEWBOX,
    elements: [
      { type: "circle", cx: "12", cy: "12", r: "10", fill: FACE_FILL },
      {
        type: "circle",
        cx: "9",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "circle",
        cx: "15",
        cy: "10",
        r: "1.25",
        fill: DETAIL_COLOR,
      },
      {
        type: "path",
        d: "M8 14c1.5 2.5 6.5 2.5 8 0",
        stroke: DETAIL_COLOR,
        strokeWidth: "1.5",
        strokeLinecap: "round",
        fill: "none",
      },
    ],
  };
}

export function getRatingFaceData(
  level: RatingFaceLevel,
  faceColor?: string,
): RatingFaceSvgData {
  let data: RatingFaceSvgData;
  switch (level) {
    case 1:
      data = getFaceLevel1();
      break;
    case 2:
      data = getFaceLevel2();
      break;
    case 3:
      data = getFaceLevel3();
      break;
    case 4:
      data = getFaceLevel4();
      break;
    case 5:
      data = getFaceLevel5();
      break;
  }
  if (faceColor) {
    const elements = data.elements.map((el, i) =>
      i === 0 ? { ...el, fill: faceColor } : el,
    );
    return { ...data, elements };
  }
  return data;
}
