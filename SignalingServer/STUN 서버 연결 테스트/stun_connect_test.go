package main

import (
	"fmt"
	"sync"

	"github.com/pion/webrtc/v3"
)

func main() {

	//STUN 서버
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	}
	//fmt.Println("STUN 서버:", config.ICEServers[0].URLs[0])

	//PeerConnection 생성
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		fmt.Println("PeerConnection 생성 실패:", err)
		return
	}
	defer peerConnection.Close()

	//ICE 후보 수집 완료를 기다리기 위한 WaitGroup
	var wg sync.WaitGroup
	wg.Add(1)

	//ICE 후보 수집 콜백 등록
	peerConnection.OnICECandidate(func(candiate *webrtc.ICECandidate) {
		if candiate != nil {
			c := candiate.ToJSON()
			fmt.Println("ICE 후보 수집됨 ")
			fmt.Println("Candidate     :", c.Candidate)
			fmt.Println("SDP Mid       :", c.SDPMid)
			fmt.Println("SDP MLineIndex:", c.SDPMLineIndex)

		} else {
			//fmt.Println("ICE 후보 수집 완료")
			wg.Done()
		}
	})

	//Offer 생성
	offer, err := peerConnection.CreateOffer(nil)
	if err != nil {
		fmt.Println("Offer 생성 실패:", err)
		return
	}
	//fmt.Println("offer SDP:", offer.SDP)

	//로컬 SDP 설명 설정
	err = peerConnection.SetLocalDescription(offer)
	if err != nil {
		fmt.Println("로컬 설명 설정 실패:", err)
		return
	}

	/*
		if peerConnection.LocalDescription() != nil {
			fmt.Println(peerConnection.LocalDescription().SDP)
		} else {
			fmt.Println("로컬 SDP가 없습니다.")
		}
	*/

	wg.Wait()

	//fmt.Println("STUN 서버 연결 성공")
}
