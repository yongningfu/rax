import Component from './component';
import {INTERNAL, RENDERED_COMPONENT} from '../constant';

let rootID = 1;

class Root extends Component {
  constructor() {
    super();
    // Using fragment instead of null for avoid create a comment node when init mount
    this.element = [];
    this.rootID = rootID++;
  }

  __getPublicInstance() {
    return this.__getRenderedComponent().__getPublicInstance();
  }

  __getRenderedComponent() {
    return this[INTERNAL][RENDERED_COMPONENT];
  }

  update(element) {
    this.element = element;
    this.forceUpdate();
  }

  render() {
    return this.element;
  }
}

export default Root;
