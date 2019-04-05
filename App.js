import React from 'react';
//import Auth from '@aws-amplify/auth';
import AWS from 'aws-sdk';
import arraybuffer from 'base64-arraybuffer';
import { Text, View, TouchableOpacity, FlatList } from 'react-native';
import { Camera, Permissions, ImageManipulator } from 'expo';


// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'ap-southeast-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ap-southeast-2:756735f7-71dc-4585-890b-eb38e30adc2e',
});
const rekognition = new AWS.Rekognition();

export default class App extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      hasCameraPermission: null,
      predictions: [],
      burstMode: false
    };
  };
  

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  };

  capturePhoto = async () => {
    if (this.camera) {
      console.log("taking photo")
      let photo = await this.camera.takePictureAsync();
      return photo.uri;
    }
  };

  resize = async photo => {
    height_res = 300;
    width_res = 300;
    console.log("resizing photo to X: " + height_res + " Y: " + width_res); //debugging
    let manipulatedImage = await ImageManipulator.manipulateAsync(
      photo,
      [{ resize: { height: height_res, width: width_res } }],
      { base64: true },
      { format: 'jpeg' }
    );
    return manipulatedImage.base64;
  };

  // rekognition stuff
  predict = async image => {
    console.log("sending photo to Rekognition"); //debugging
    buffer = arraybuffer.decode(image)
    
    const params = {
        Image: { /* required */
          Bytes: buffer,
        },
        MaxLabels: 5,
        MinConfidence: 80.0
      };

      const response = await rekognition.detectLabels(params).promise().catch(err => console.log(err));
      return response;
    };

  loopFunction = async () => {
    let maxTimes = 30;
    for (i = 0; i < maxTimes; i++){
      console.log("running detection for", i, "times");
      let photo = await this.capturePhoto();
      let resized = await this.resize(photo);
      let predictions = await this.predict(resized);
      this.setState({ predictions: predictions.Labels});
    }
  };

  /*
  objectDetection = async () => {
      console.log("eep");
      let photo = await this.capturePhoto();
      let resized = await this.resize(photo);
      let predictions = await this.predict(resized);
      this.setState({ predictions: predictions.Labels});
  };
  */

  render() {
    const { hasCameraPermission, predictions } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={{ flex: 1 }}>
          <Camera
            ref={ref => {
              this.camera = ref;
            }}
            style={{ flex: 1 }}
            type={this.state.type}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}
            >
              <View
                style={{
                  flex: 1,
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                }}
              >
              
                <FlatList
                  data={
                    predictions.map(
                      prediction => ({
                        key: `${prediction.Name} ${prediction.Confidence}%`,
                      })
                    )
                    }
                  renderItem={({ item }) => (
                    <Text style={{ paddingTop: 20, paddingLeft: 15, color: 'white', fontSize: 30 }}>{item.key}</Text>
                  )}
                />
              </View>
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignItems: 'center',
                  backgroundColor: '#FF9900',
                  height: '10%',
                }}
                onPress={
                    this.loopFunction
                  }
                >
                <Text style={{ fontSize: 30, color: 'white', padding: 15 }}>
                  {' '}
                  Detect Objects!{' '}
                </Text>
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      );
    }
  };

}

