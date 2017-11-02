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
    this._input = 0;
    this.state = this.initialState;
    this.addSome = this.addSome.bind(this);
    this.logOut = this.logOut.bind(this);
    this.fetchBucket = this.fetchBucket.bind(this);
    this.calculateAmounts = this.calculateAmounts.bind(this);
    this.updateAsyncStorage = this.updateAsyncStorage.bind(this);
    this.dataRef = this.dataRef.bind(this);
    this.listenToFirebase = this.listenToFirebase.bind(this);
  }

  componentWillMount () {
    firebase.initializeApp(firebaseConfig);
    this.getBucketDetailsFromStorage();
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.bucket && this.state.bucket) {
      this.listenToFirebase();
    }
  }

  async getBucketDetailsFromStorage () {
    try {
      const dataFromStorage = await AsyncStorage.getItem(bucketStorageKey);
      if (dataFromStorage){
        // We have data!!
        var { bucket, password, amounts = {}} = JSON.parse(dataFromStorage);
        this.setState({
          amounts: amounts,
          bucket,
          password,
          storageLoading: false,
          fetchingFromFirebase: true
        });
      } else {
        this.setState({ storageLoading: false });
      }
    } catch (error) {
      console.log('Error fetching data from AsyncStorage');
    }
  }

  async logOut () {
    await AsyncStorage.removeItem(bucketStorageKey);
    this._dataRef = null;
    this.setState({ ...this.initialState, storageLoading: false });
  }

  dataRef () {
    if (this._dataRef) return this._dataRef;
    if (!this.state.bucket) return;
    const dataRefKey = 'buckets/' + this.state.bucket + '/secrets/' + this.state.password + '/amounts';
    this._dataRef = firebase.database().ref(dataRefKey);
    return this._dataRef;
  }

  calculateAmounts () {
    if (!this.state.amounts) return 0;
    return Object.keys(this.state.amounts).reduce((previous, key) => previous + this.state.amounts[key], 0);
  }

  addSome () {
    if (!this.dataRef()) {
      Alert.alert('Initiating bucket, please try again.')
      return;
    }
    const newValue = this._input;
    const undoKey = this.dataRef().push(newValue).key
    this.setState(previousState => {
      const amounts = { ...previousState.amounts, [undoKey]: newValue };
      this.updateAsyncStorage(amounts);
      return { amounts };
    });
    this._input = 0;
    this._inputElement.setNativeProps({text: ''});
  }

  listenToFirebase () {
    if (this.dataRef()) {
      this.dataRef().once('value').then((snapshot) => {
        const amounts = snapshot.val();
        this.setState({ amounts, fetchingFromFirebase: false });
        this.updateAsyncStorage(amounts);
      }).catch((error)=>{
        console.log('Error fetching data from firebase');
      });;
      this.dataRef().on('child_added', (data) => {
        this.setState(previousState => {
          const amounts = { ...previousState.amounts, [data.key]: data.val() };
          this.updateAsyncStorage(amounts)
          return { amounts };
        });
      });
    }
  }

  fetchBucket () {
    if (this.validateField(this._bucket) && this.validateField(this._password)) {
      this.setState({ bucket: this._bucket, password: this._password, fetchingFromFirebase: true })
    } else {
      Alert.alert('Please use at least 4 characters on both bucket name and password')
    }
  }

  validateField (text) {
    return text && text.length >= 4;
  }

  updateAsyncStorage (amounts, bucket = this.state.bucket, password = this.state.password) {
    const dataForStore = {
      amounts,
      bucket,
      password
    }
    try {
      AsyncStorage.setItem(bucketStorageKey, JSON.stringify(dataForStore));
    } catch (error) {
      console.log('Error Saving Data to AsyncStorage');
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
          style={[styles.credsInput]}
          placeholderTextColor='#ddddee'
          autoCapitalize='none'
          autoCorrect={false}
          autoFocus
          returnKeyType='next'
          onChangeText={(input) => this._bucket = input}
          placeholder='BUCKET NAME'
        />
        <TextInput
          style={[styles.credsInput]}
          placeholderTextColor='#ddddee'
          autoCorrect={false}
          secureTextEntry
          onChangeText={(input) => this._password = input}
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

  renderNumberOrLoading () {
    if (this.state.fetchingFromFirebase) {
      return <ActivityIndicator style={styles.bigNumberContent} size='large' />
    } else {
      return <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.bigNumber, styles.bigNumberContent]}
              >
                {this.calculateAmounts()}
              </Text>
    }
  }

  render() {
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
              <Text style={styles.bucketName}>{this.state.bucket}</Text>
              {this.renderNumberOrLoading()}
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
    textAlign: 'center',
    color: '#841584'
  },
  subCaption: {
    fontSize: 20
  },
  credsInput: {
    fontSize: 50,
    alignSelf: 'stretch',
    textAlign: 'center',
    color: '#841584'
  },
  bigNumberContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bucketName: {
    fontSize: 18,
    color: '#ddddee'
  },
  bigNumber: {
    textAlign: 'center',
    fontSize: 150
  },
  bigNumberContent: {
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
