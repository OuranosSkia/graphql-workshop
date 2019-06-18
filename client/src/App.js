import React from 'react';
import logo from './logo.svg';
import './App.css';

class App extends React.Component {
  state = {
    rocksData: [],
    lakeData: []
  }

  constructor(props) {
    super(props)

    fetch('/api/rocks')
      .then(res => res.json())
      .then((data) => {
        this.setState({
          rocksData: data.items
        })
      })
    fetch('/api/lake')
      .then(res => res.json())
      .then((data) => {
        this.setState({
          lakeData: data.items
        })
      })
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>
            Welcome to the GraphQL Workshop!
          </p>
          <img src={logo} className="App-logo" alt="logo" />
          <div className="image-wrap">
            <div className="rocks">
              {this.state.rocksData.map((rocksImg) => (
                <img src={rocksImg.src} />
              ))}
            </div>
            <div className="lake">
              {this.state.lakeData.map((ckImg) => (
                <img src={ckImg.src} />
              ))}
            </div>
          </div>
        </header>
      </div>
    );
  }
}

export default App;
