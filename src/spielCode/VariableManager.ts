export type VariableCollection = {
  [key: string]: any;
};

class VariableManager {
  _localVariables: VariableCollection;

  constructor(initialVariables?: VariableCollection) {
    this._localVariables = initialVariables ? { ...initialVariables } : {};
  }

  get(key: string): any {
    return this._localVariables[key];
  }

  set(key: string, value: any): void {
    this._localVariables[key] = value;
  }

  toCollection(): VariableCollection {
    return { ...this._localVariables };
  }
}

export default VariableManager;