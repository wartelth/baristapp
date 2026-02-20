import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

let RNMapView: any = null;
let RNMarker: any = null;
try {
  const maps = require("react-native-maps");
  RNMapView = maps.default;
  RNMarker = maps.Marker;
} catch {
  // react-native-maps not installed
}

export function MapViewRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "mapView") return null;
  const theme = useTheme();
  const { markersKey, initialRegion, height = 300, onMarkerPress } = component.props;

  const markers = markersKey && Array.isArray(state[markersKey])
    ? (state[markersKey] as any[])
    : [];

  const defaultRegion = initialRegion ?? {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  if (!RNMapView) {
    return (
      <View style={[styles.placeholder, { height, backgroundColor: theme.surfaceColor }]}>
        <Text style={{ color: theme.secondaryTextColor }}>
          Map not available (react-native-maps not installed)
        </Text>
        {markers.length > 0 && (
          <Text style={{ color: theme.secondaryTextColor, marginTop: 8 }}>
            {markers.length} marker(s) loaded
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <RNMapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={defaultRegion}
      >
        {markers.map((marker: any, i: number) => (
          <RNMarker
            key={marker.id ?? i}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
            onPress={() => {
              if (onMarkerPress) {
                dispatch({ type: "setState", key: "_selectedMarker", value: marker });
                dispatch(onMarkerPress);
              }
            }}
          />
        ))}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 8,
  },
});
