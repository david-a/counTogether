import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Button, TextInput, ScrollView, Alert, AsyncStorage } from 'react-native';
import firebase from 'firebase'
import firebaseConfig from './config/firebase'
import bucketStorageKey from './config/asyncStorage'

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.initialState = {
      amounts: {},
      bucket: null,
      password: null,
      storageLoading: true
    };
    this.state = this.initialState;
    this.addSome = this.addSome.bind(this);
    this.logOut = this.logOut.bind(this);
    this.fetchBucket = this.fetchBucket.bind(this);
    this.onBucketChange = this.onBucketChange.bind(this);
    this.onPasswordChange = this.onPasswordChange.bind(this);
    this.calculateAmounts = this.calculateAmounts.bind(this);
  }

  componentWillMount () {
    firebase.initializeApp(firebaseConfig);
    this.getBucketDetailsFromStorage();
  }

  async getBucketDetailsFromStorage () {
    try {
      const dataFromStorage = await AsyncStorage.getItem(bucketStorageKey);
      if (dataFromStorage){
        // We have data!!
        var { bucket, password, amounts = {}} = JSON.parse(dataFromStorage);
        console.log("got From Storage", bucket);
        this.setState({
          amounts: amounts,
          bucket,
          password,
          storageLoading: false
        })
        this._dataRef = firebase.database().ref(this.dataRefKey(this.state.bucket, this.state.password));
        this._dataRef.once('value').then((snapshot) => {
          console.log("Received value From Firebase:", snapshot.val());
          this.setState({
            amounts: snapshot.val() || amounts,
          })
        });
        this._dataRef.on('child_added', (data) => {
          console.log("Received child_added From Firebase:", data);
          this.setState(previousState => {
            const amounts = { ...previousState.amounts, [data.key]: data.val() };
            const dataForStore = {
              amounts,
              bucket,
              password
            }
            AsyncStorage.setItem(bucketStorageKey, JSON.stringify(dataForStore));
            return { amounts };
          });
        });
      } else {
        this.setState({ storageLoading: false });
      }
    } catch (error) {
      console.log(error);
      // Error retrieving data
    }
  }

  async logOut () {
    await AsyncStorage.removeItem(bucketStorageKey);
    this.setState({ ...this.initialState, storageLoading: false });
  }

  dataRefKey (bucket, password) {
    return 'buckets/' + bucket + '/secrets/' + password + '/amounts';
  }

  calculateAmounts () {
    return Object.keys(this.state.amounts).reduce((previous, key) => previous + this.state.amounts[key], 0);
  }

  addSome () {
    const newValue = this._input;
    console.log("NEW VALUE: " , newValue);
    const undoKey = this._dataRef.push(newValue).key
    console.log("unddo", undoKey);
    this.setState(previousState => {
      const amounts = { ...previousState.amounts, [undoKey]: newValue };
      const dataForStore = {
        amounts,
        bucket: this.state.bucket,
        password: this.state.password
      }
      AsyncStorage.setItem(bucketStorageKey, JSON.stringify(dataForStore));
      return { amounts };
    });
    this._input = 0;
    this._inputElement.setNativeProps({text: ''});
  }

  fetchBucket () {
    if (this.state.bucketIsValid && this.state.passwordIsValid) {
      const bucket = this._bucket;
      const password = this._password;
      try {
        this._dataRef = firebase.database().ref(this.dataRefKey(this._bucket, this._password));
        this._dataRef.once('value').then((snapshot) => {
          console.log("LOADED ONCE");
          const dataForStore = {
            amounts: snapshot.val() || [],
            bucket,
            password,
          }
          this.setState(dataForStore)
          AsyncStorage.setItem(bucketStorageKey, JSON.stringify(dataForStore));
        });
        this._dataRef.on('child_added', (data) => {
          console.log("Received child_added From Firebase:", data);
          this.setState(previousState => {
            const amounts = { ...previousState.amounts, [data.key]: data.val() };
            const dataForStore = {
              amounts,
              bucket,
              password
            }
            AsyncStorage.setItem(bucketStorageKey, JSON.stringify(dataForStore));
            return { amounts };
          });
        });
      } catch (error) {
        console.log(error);
        // Error saving data
      }
    } else {
      Alert.alert('Please only use digits and english characters')
    }
  }

  validateField (text) {
    return !text || text.indexOf(':') === -1;
  }

  onBucketChange (text) {
    this._bucket = text;
    if (this.validateField(text) !== this.state.bucketIsValid ) {
      this.setState({ bucketIsValid: this.validateField(text) })
    }
  }

  onPasswordChange (text) {
    this._password = text;
    if (this.validateField(text) !== this.state.passwordIsValid ) {
      this.setState({ passwordIsValid: this.validateField(text) })
    }
  }

  askForBucket () {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            ALOHA!
          </Text>
          <Text style={styles.subCaption}>
            Log in to your bucket or create a new one
          </Text>
        </View>
        <TextInput
          style={[styles.credsInput, !this.state.bucketIsValid && styles.invalidInput ]}
          autoCapitalize='none'
          autoCorrect={false}
          autoFocus
          returnKeyType='next'
          onChangeText={this.onBucketChange}
          placeholder='BUCKET NAME'
        />
        <TextInput
          style={[styles.credsInput, !this.state.passwordIsValid && styles.invalidInput ]}
          autoCorrect={false}
          secureTextEntry
          onChangeText={this.onPasswordChange}
          placeholder='PASSWORD'
        />
        <Button
          onPress={this.fetchBucket}
          title="Go!"
          color="#841584"
          accessibilityLabel="Go!"
        />
      </View>
    )
  }

  render() {
    console.log("State:", this.state);
    if (this.state.storageLoading) {
      return <ActivityIndicator />
    }
    else if (!this.state.bucket) {
      return this.askForBucket();
    } else {
      return (
        <ScrollView
          scrollEnabled={false}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={styles.container}
          >
            <View style={styles.bigNumberContainer}>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.bigNumber}>{this.calculateAmounts()}</Text>
              </View>
              <View style={styles.buttonsContainer}>
                <TextInput
                  style={styles.addValueTextInput}
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
                <View style={styles.logOutButton}>
                  <Button
                    onPress={this.logOut}
                    title="Log Out"
                    color="#841584"
                    accessibilityLabel="Add 5 more"
                  />
                </View>
              </View>
            </ScrollView>
          );
        }
    }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  captionContainer: {
    marginBottom: 30
  },
  caption: {
    fontSize: 50,
    textAlign: 'center'
  },
  subCaption: {
    fontSize: 20
  },
  invalidInput: {
    color: 'red'
  },
  credsInput: {
    fontSize: 50,
    alignSelf: 'stretch',
    textAlign: 'center'
  },
  bigNumberContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bigNumber: {
    textAlign: 'center',
    fontSize: 150,
    height: 150,
    width: '90%'
  },
  buttonsContainer: {
    flex: 1,
    backgroundColor: '#eeeeff'
  },
  addValueTextInput: {
    height: 70,
    fontSize: 50,
    borderWidth: 0,
    textAlign: 'center'
  },
  logOutButton: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 30
  }
});
