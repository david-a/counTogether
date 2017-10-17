import React from 'react';
import { StyleSheet, Text, View, Button, TextInput, ScrollView} from 'react-native';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { amounts: [] };
    this.addSome = this.addSome.bind(this);
  }

  calculateAmounts () {
    return this.state.amounts.reduce((sum, value) => sum + value, 0)
  }

  addSome () {
    let newValue = this._input;
    this.setState(previousState => ({ amounts: previousState.amounts.concat([newValue])}));
    this._input = 0;
    this._inputElement.setNativeProps({text: ''});
  }

  render() {
    return (
      <ScrollView
        scrollEnabled={false}
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={styles.container}
      >
        <View style={styles.bigNumberContainer}>
          <Text style={styles.bigNumber}>{this.calculateAmounts()}</Text>
        </View>
        <View style={styles.buttonsContainer}>
          <TextInput
            style={styles.textInput}
            keyboardType='numeric'
            onChangeText={(text) => this._input = parseInt(text)}
            ref={(c) => this._inputElement = c}
            placeholder='ADD HERE'
            onFocus={() => this._inputElement.setNativeProps({placeholder: ''})}
            onBlur={() => this._inputElement.setNativeProps({placeholder: 'ADD MORE!'})}
          />
          <Button
            onPress={this.addSome}
            title="Ok"
            color="#841584"
            accessibilityLabel="Add 5 more"
          />
      </View>
    </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  bigNumberContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bigNumber: {
    fontSize: 100
  },
  buttonsContainer: {
    flex: 1,
    backgroundColor: '#eeeeff'
  },
  textInput: {
    height: 70,
    fontSize: 50,
    borderWidth: 0,
    textAlign: 'center'
  }
});
