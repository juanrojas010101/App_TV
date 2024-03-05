import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, ImageBackground, Image } from 'react-native';
import io from 'socket.io-client';
import * as Animatable from 'react-native-animatable';

const socket = io('http://192.168.0.172:3000');
let timer: NodeJS.Timeout | null = null;

const TelevisorComponent: React.FC = () => {
  const [televisorData, setTelevisorData] = useState<any>(null);
  const [predioData, setPredioData] = useState<any>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [tipoFruta, setTipoFruta] = useState<string>('');
  const [kilosProcesadasHora, setKilosProcesadasHora] = useState<number>(0);
  const [kilosExportacionHora, setKilosExportacionHora] = useState<number>(0);
  const [procesadasWidth, setProcesadasWidth] = useState<number>(0);
  const [exportacionWidth, setExportacionWidth] = useState<number>(0);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
    if ((appState === 'active' || appState === 'unknown') && nextAppState === 'background') {
      console.log('App has gone to the background!');
      const endDate = new Date().toISOString();
      const fechaFinRequest = {
        data: {
          action: 'fechaFinProceso',
          fechaFin: endDate,
          collection: 'variablesDesktop'
        }
      };
      console.log("Enviando solicitud de fecha fin:", fechaFinRequest);
      socket.emit('Desktop', fechaFinRequest, (response: any) => {
        console.log("Respuesta del servidor (fecha fin):", response);
      });
    }
  };

  useEffect(() => {
    console.log("Componente montado");

    const fetchData = async () => {
      try {
        console.log("Enviando solicitud para obtener datos del televisor...");
        socket.emit('Desktop', { data: { action: 'obtenerEF1Sistema', collection: 'variablesDesktop' } }, (response: any) => {
          console.log("Respuesta del servidor (televisor):", response);
          setTelevisorData(response);
          setTipoFruta(response.tipoFruta);
        });
      } catch (error) {
        console.error("Error al obtener datos del televisor:", error);
      }
    };

    fetchData();

    const simulateData = () => {
      const kilosProcesadas = Math.floor(Math.random() * 100); // Simular entre 0 y 100 kilos procesadas
      const kilosExportacion = Math.floor(Math.random() * 50); // Simular entre 0 y 50 kilos exportados
      setKilosProcesadasHora(kilosProcesadas);
      setKilosExportacionHora(kilosExportacion);
    };

    simulateData();

    const currentDate = new Date().toISOString();
    const fechaInicioRequest = {
      data: {
        action: 'fechaInicioProceso',
        fechaInicio: currentDate,
        collection: 'variablesDesktop'
      }
    };
    console.log("Enviando solicitud de fecha inicio:", fechaInicioRequest);
    socket.emit('Desktop', fechaInicioRequest, (response: any) => {
      console.log("Respuesta del servidor (fecha inicio):", response);
    });

    if (!timer) {
      timer = setInterval(() => {
        setTimeElapsed((prevTime) => prevTime + 1);
      }, 1000);
    }

    AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      (AppState as any).removeEventListener('change', handleAppStateChange);
    };
  }, []);

  useEffect(() => {
    if (televisorData && televisorData.predio) {
      const request = {
        data: {
          select: {},
          populate: {
            path: 'predio',
            select: 'PREDIO ICA',
          },
          sort: { fechaIngreso: -1 },
        },
        collection: 'lotes',
        action: 'getLotes',
        query: 'proceso'
      };

      const fetchData = async () => {
        try {
          console.log("Enviando solicitud para obtener datos del predio...");
          socket.emit('Desktop', { data: request }, (response: any) => {
            console.log("Respuesta del servidor (predio):", response);
            const idPredioPrimeraPeticion = televisorData.predio;
            const predioEncontrado = response.data.find((item: any) => item.predio._id === idPredioPrimeraPeticion);
            console.log("Predio encontrado:", predioEncontrado);
            setPredioData(predioEncontrado);
          });
        } catch (error) {
          console.error("Error al obtener datos del predio:", error);
        }
      };

      fetchData();
    }
  }, [televisorData]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const rendimiento = predioData?.rendimiento || 0;
  const porcentaje = Math.min(rendimiento, 100);
  const barraColor = porcentaje > 70 ? 'green' : 'red'; // Cambiar el color a verde si el rendimiento es mayor al 70%

  // Establecer el valor máximo para las barras de progreso
  const maxKilosPorHora = 100;

  // Calcular el porcentaje de kilos procesados y exportados
  const porcentajeProcesadas = (kilosProcesadasHora / maxKilosPorHora) * 100;
  const porcentajeExportacion = (kilosExportacionHora / maxKilosPorHora) * 100;

  // Determinar el color de las barras de progreso
  const barraProcesadasColor = porcentajeProcesadas > 70 ? 'green' : '#FF0000';
  const barraExportacionColor = porcentajeExportacion > 70 ? 'green' : '#FF0000';

  return (
    <ImageBackground source={require('./img/img1.jpg')} style={styles.backgroundImage}>
      <Animatable.View animation="fadeIn" duration={1000} style={styles.container}>
        <Animatable.View animation="fadeIn" duration={1000} style={styles.headerContainer}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
          </View>
          <View style={styles.spacer} />
          <Animatable.View animation="fadeIn" duration={1000} style={styles.newCard}>
            {tipoFruta === 'Naranja' && <Image source={require('./img/naranja.jpg')} style={styles.frutaImage} />}
            {tipoFruta === 'Limon' && <Image source={require('./img/limon.jpg')} style={styles.frutaImage} />}
          </Animatable.View>
        </Animatable.View>
        
        <Animatable.View animation="fadeIn" duration={1000} style={styles.cardContainer}>
          <Animatable.View animation="fadeIn" duration={1000} style={[styles.card, {backgroundColor: '#000'}]}>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>ENF:</Text> {televisorData?.enf}</Text>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Nombre:</Text> {televisorData?.nombrePredio}</Text>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Kilos Procesados:</Text> {kilosProcesadasHora}</Text>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Kilos Exportación: </Text>{kilosExportacionHora}</Text>
          </Animatable.View>
          <Animatable.View animation="fadeIn" duration={1000} style={[styles.card, {backgroundColor: '#000'}]}>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Rendimiento:</Text> {rendimiento}</Text>
            <View style={[styles.progressBarContainer, { backgroundColor: '#f2f2f2' }]}>
              <Animatable.View animation="slideInLeft" duration={1500} style={[styles.progressBar, { width: `${porcentaje}%`, backgroundColor: barraColor }]}>
                <Text style={styles.progressBarText}>{`${porcentaje}%`}</Text>
              </Animatable.View>
            </View>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Kilos procesados Hora:</Text> {kilosProcesadasHora}</Text>
            <View style={[styles.progressBarContainer, { backgroundColor: '#f2f2f2' }]}>
              <Animatable.View animation="slideInLeft" duration={1500} style={[styles.progressBar, { width: `${porcentajeProcesadas}%`, backgroundColor: barraProcesadasColor }]}>
                <Text style={styles.progressBarText}>{`${kilosProcesadasHora} kg`}</Text>
              </Animatable.View>
            </View>
            <Text style={[styles.cardText, {color: '#fff'}]}><Text style={styles.bold}>Kilos Exportación Hora:</Text> {kilosExportacionHora}</Text>
            <View style={[styles.progressBarContainer, { backgroundColor: '#f2f2f2' }]}>
              <Animatable.View animation="slideInLeft" duration={1500} style={[styles.progressBar, { width: `${porcentajeExportacion}%`, backgroundColor: barraExportacionColor }]}>
                <Text style={styles.progressBarText}>{`${kilosExportacionHora} kg`}</Text>
              </Animatable.View>
            </View>
          </Animatable.View>
        </Animatable.View>
      </Animatable.View>
    </ImageBackground>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Alineación horizontal centrada
    marginBottom: 15,
  },
  timerContainer: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 20,
    marginTop: '2%',
    width: 200, // Ancho del cronómetro y la nueva tarjeta
    alignItems: 'center',
  },
  spacer: {
    width: 20, // Espacio entre el cronómetro y la nueva tarjeta
  },
  timerText: {
    fontSize: 50, // Aumentar tamaño del texto del cronómetro
    color: '#fff',
    fontWeight: 'bold',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: '1.5%',
    width: '97%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    borderRadius: 20,
    padding: 36,
    marginBottom: 25,
    width: '49%', // Ancho original de las tarjetas izquierda y derecha
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newCard: {
    backgroundColor: '#fff',
    borderRadius: 20, 
    padding: 10, 
    marginBottom: 0, 
    marginTop: '2%',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardText: {
    fontSize: 32,
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  rendimientoText: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  progressBarContainer: {
    borderRadius: 5,
    height: 40,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarText: {
    color: 'white',
    fontWeight: 'bold',
  },
  backgroundImage: {
    flex: 2,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  frutaImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
});
export default TelevisorComponent;