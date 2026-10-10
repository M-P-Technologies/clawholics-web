interface ToggleBulletListParams {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface ToggleBulletListResult {
  newValue: string;
  newSelectionStart: number;
  newSelectionEnd: number;
}

type BulletHandlerResult = {
  newValue: string;
  newCursorPosition: number;
};

const BULLET = "• ";

const getLineStart = (value: string, cursorPosition: number) => {
  return value.lastIndexOf("\n", cursorPosition - 1) + 1;
};

const getLineEnd = (value: string, cursorPosition: number) => {
  const nextNewLine = value.indexOf("\n", cursorPosition);
  return nextNewLine === -1 ? value.length : nextNewLine;
};

const getCurrentLine = (value: string, cursorPosition: number) => {
  const lineStart = getLineStart(value, cursorPosition);
  const lineEnd = getLineEnd(value, cursorPosition);

  return {
    lineStart,
    lineEnd,
    line: value.slice(lineStart, lineEnd),
  };
};

const isBulletLine = (line: string) => {
  return line.startsWith(BULLET);
};

const removeBulletFromLine = (line: string) => {
  return line.replace(/^•\s/, "");
};

export function toggleBulletList({
  value,
  selectionStart,
  selectionEnd,
}: ToggleBulletListParams): ToggleBulletListResult {
  const lineStart = getLineStart(value, selectionStart);
  const lineEnd = getLineEnd(value, selectionEnd);

  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split("\n");

  const nonEmptyLines = lines.filter((line) => line.trim() !== "");

  const allBulleted =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => isBulletLine(line));

  const updatedLines = lines.map((line) => {
    if (line.trim() === "") {
      return line;
    }

    if (allBulleted) {
      return removeBulletFromLine(line);
    }

    if (isBulletLine(line)) {
      return line;
    }

    return `${BULLET}${line}`;
  });

  const updatedBlock = updatedLines.join("\n");

  const newValue =
    value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);

  return {
    newValue,
    newSelectionStart: lineStart,
    newSelectionEnd: lineStart + updatedBlock.length,
  };
}

export function handleBulletEnter(
  value: string,
  cursorPosition: number
): BulletHandlerResult | null {
  const { lineStart, lineEnd, line } = getCurrentLine(value, cursorPosition);

  if (!isBulletLine(line)) {
    return null;
  }

  const contentAfterBullet = line.replace(/^•\s/, "");

  if (contentAfterBullet.trim() === "") {
    const newValue = value.slice(0, lineStart) + value.slice(lineEnd);

    return {
      newValue,
      newCursorPosition: lineStart,
    };
  }

  const insertion = `\n${BULLET}`;

  const newValue =
    value.slice(0, cursorPosition) +
    insertion +
    value.slice(cursorPosition);

  return {
    newValue,
    newCursorPosition: cursorPosition + insertion.length,
  };
}

export function handleBulletBackspace(
  value: string,
  cursorPosition: number
): BulletHandlerResult | null {
  const { lineStart, lineEnd, line } = getCurrentLine(value, cursorPosition);

  if (!isBulletLine(line)) {
    return null;
  }

  const bulletEndPosition = lineStart + BULLET.length;

  if (cursorPosition !== bulletEndPosition) {
    return null;
  }

  const lineWithoutBullet = removeBulletFromLine(line);

  const newValue =
    value.slice(0, lineStart) +
    lineWithoutBullet +
    value.slice(lineEnd);

  return {
    newValue,
    newCursorPosition: lineStart,
  };
}
