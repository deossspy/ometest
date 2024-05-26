let localStream;
let remoteStream;
let peerConnection;
const servers = {
    iceServers: [
        {
            urls: 'stun:stun1.l.google.com:19302'
        }
    ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(JSON.stringify({ answer }));
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
};

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        setupPeerConnection();

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (error) {
        console.error('Error accessing webcam: ', error);
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    peerConnection.ontrack = event => {
        event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    peerConnection.onnegotiationneeded = async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({ offer }));
    };
}

function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}

startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', stopCamera);
