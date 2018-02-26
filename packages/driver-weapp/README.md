# driver-weapp

> Weapp driver for Rax.

## Install

```bash
$ npm install --save driver-weapp
```

## Use

```jsx
import {createElement, Component, render} from 'rax';
import WeappDriver from 'driver-weapp';

class Example extends Component {
  render() {
    return (
      <view>
        <image style={{width: 560, height: 560}} src="https://img.alicdn.com/tps/TB1z.55OFXXXXcLXXXXXXXXXXXX-560-560.jpg" />
      </view>
    );
  }
}

render(<Example />, null, {
  driver: WeappDriver
});
```
