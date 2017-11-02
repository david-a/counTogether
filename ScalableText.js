import React, {Component} from 'react'
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

class ScalableText extends Component {
  constructor(props) {
    super(props);
    this.state = {
      size: 0.5,
      complete: false,
    }
  }

  setSize() {
    const maxHeight = this.props.height
    this.refs.field.measure((x, y, width, height, px, py) =>{
      if (maxHeight < height) {
        if (this.state.size == 0.5) {
          this.setState({complete: true});
        } else {
          this.setState({size: this.state.size -= 0.5, complete: true});
          this.setSize()
        }
      } else {
        if (!this.state.complete) {
          this.setState({size: this.state.size += 0.5})
          this.setSize()
        }
      }
    })
  }
  componentDidMount() {
    this.setSize()
  }

  render() {
    return (
      <Text
        {...this.props}
        ref="field"
        style={[
          this.props.style,
          {
            fontSize: this.state.size,
            color: this.state.complete ? 'black': 'transparent',
            width: this.props.width,
          }
        ]}>
          {this.props.children}
      </Text>
    )
  }
}

ScalableText.defaultProps = {
  style: false
}

export default ScalableText;
