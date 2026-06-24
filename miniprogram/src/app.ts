import { Component } from 'react';
import './app.css';

class App extends Component {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  // this.props.children is the page to be rendered
  render() {
    return this.props.children;
  }
}

export default App;
