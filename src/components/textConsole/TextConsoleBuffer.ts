export type TextConsoleLine = { key: number, text: string };

class TextConsoleBuffer {
  private readonly _maxLineCount: number;
  private _lines: TextConsoleLine[];
  private _nextKey: number;

  constructor(maxLineCount: number) {
    this._lines = [];
    this._maxLineCount = maxLineCount;
    this._nextKey = 0;
  }

  addLine(text: string) {
    const key = this._nextKey++;
    this._lines.push({ key, text })
    if (this._lines.length > this._maxLineCount) this._lines.shift();
  }

  replaceLastLine(text: string) {
    if (this._lines.length === 0) return;
    this._lines.pop();
    this.addLine(text);
  }

  clear() {
    this._lines = [];
  }

  setLines(lines: TextConsoleLine[]) {
    this._lines = [...lines];
    // Re-assign keys to ensure uniqueness if needed, or trust the saved ones?
    // Let's trust saved ones but ensure nextKey is higher than any existing key.
    if (this._lines.length > 0) {
      const maxKey = Math.max(...this._lines.map(l => l.key));
      this._nextKey = maxKey + 1;
    } else {
      this._nextKey = 0;
    }
  }

  get lines(): TextConsoleLine[] {
    return [...(this._lines)];
  }
}

export default TextConsoleBuffer;