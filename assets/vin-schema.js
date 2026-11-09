/* CarDNA — the single VIN field schema, shared by the decoder and the comparison tool. */
(function () {
  "use strict";

  window.CarDNASchema = {
    sections: [
      {
        title: "Identity",
        fields: [
          ["Make", "Make"], ["Model", "Model"], ["Model year", "Model Year"],
          ["Series", "Series"], ["Series 2", "Series2"], ["Trim", "Trim"], ["Trim 2", "Trim2"],
          ["Vehicle type", "Vehicle Type"], ["Body class", "Body Class"], ["Doors", "Doors"],
          ["Steering location", "Steering Location"], ["Destination market", "Destination Market"],
          ["Vehicle descriptor", "Vehicle Descriptor"]
        ]
      },
      {
        title: "Engine",
        fields: [
          ["Engine model", "Engine Model"], ["Cylinders", "Engine Number of Cylinders"],
          ["Displacement (CC)", "Displacement (CC)"], ["Displacement (CI)", "Displacement (CI)"],
          ["Displacement (L)", "Displacement (L)"], ["Engine configuration", "Engine Configuration"],
          ["Valve train", "Valve Train Design"], ["Aspiration", "Aspiration"], ["Turbo", "Turbo"],
          ["Cooling type", "Cooling Type"], ["Stroke cycles", "Engine Stroke Cycles"],
          ["Power (kW)", "Engine Power (kW)"], ["Brake hp from", "Engine Brake (hp) From"],
          ["Brake hp to", "Engine Brake (hp) To"], ["Top speed (mph)", "Top Speed (MPH)"],
          ["Engine manufacturer", "Engine Manufacturer"], ["Other engine info", "Other Engine Info"]
        ]
      },
      {
        title: "Fuel & electrification",
        fields: [
          ["Fuel — primary", "Fuel Type - Primary"], ["Fuel — secondary", "Fuel Type - Secondary"],
          ["Delivery / injection", "Fuel Delivery/Fuel Injection Type"],
          ["Electrification level", "Electrification Level"], ["EV drive unit", "EV Drive Unit"],
          ["Battery type", "Battery Type"], ["Battery energy (kWh)", "Battery Energy (kWh) From"],
          ["Battery voltage (V)", "Battery Voltage (Volts) From"], ["Charger level", "Charger Level"],
          ["Charger power (kW)", "Charger Power (kW)"],
          ["Cells per module", "Number of Battery Cells per Module"],
          ["Modules per pack", "Number of Battery Modules per Pack"],
          ["Packs per vehicle", "Number of Battery Packs per Vehicle"]
        ]
      },
      {
        title: "Drivetrain & transmission",
        fields: [
          ["Drive type", "Drive Type"], ["Transmission style", "Transmission Style"],
          ["Transmission speeds", "Transmission Speeds"],
          ["Transmission manufacturer", "Transmission Manufacturer"], ["Axles", "Axles"]
        ]
      },
      {
        title: "Body, dimensions & weights",
        fields: [
          ["Seat rows", "Number of Seat Rows"], ["Wheels", "Number of Wheels"],
          ["Wheelbase from (in)", "Wheelbase (inches) From"], ["Wheelbase to (in)", "Wheelbase (inches) To"],
          ["Wheel size front (in)", "Wheel Size Front (inches)"], ["Wheel size rear (in)", "Wheel Size Rear (inches)"],
          ["Track width (in)", "Track Width (inches)"], ["Bed type", "Bed Type"],
          ["Bed length (in)", "Bed Length (inches)"], ["Cab type", "Cab Type"],
          ["Curb weight (lb)", "Curb Weight (pounds)"],
          ["GVWR from", "Gross Vehicle Weight Rating From"], ["GVWR to", "Gross Vehicle Weight Rating To"],
          ["Trailer connection", "Trailer Type Connection"], ["Trailer body type", "Trailer Body Type"],
          ["Trailer length (ft)", "Trailer Length (feet)"]
        ]
      },
      {
        title: "Safety & driver assist",
        fields: [
          ["Seat belt type", "Seat Belt Type"], ["Other restraint info", "Other Restraint System Info"],
          ["Pretensioner", "Pretensioner"], ["Front airbags", "Front Air Bag Locations"],
          ["Knee airbags", "Knee Air Bag Locations"], ["Side airbags", "Side Air Bag Locations"],
          ["Curtain airbags", "Curtain Air Bag Locations"], ["Seat cushion airbags", "Seat Cushion Air Bag Locations"],
          ["ABS", "Antilock Braking System (ABS)"], ["Stability control", "Electronic Stability Control (ESC)"],
          ["Traction control", "Traction Control"], ["Blind spot warning", "Blind Spot Warning (BSW)"],
          ["Forward collision warning", "Forward Collision Warning (FCW)"],
          ["Lane departure warning", "Lane Departure Warning (LDW)"],
          ["Lane keeping assist", "Lane Keeping Assistance (LKA)"],
          ["Lane centering assist", "Lane Centering Assistance"],
          ["Adaptive cruise control", "Adaptive Cruise Control (ACC)"],
          ["Crash imminent braking", "Crash Imminent Braking (CIB)"],
          ["Dynamic brake support", "Dynamic Brake Support (DBS)"],
          ["Pedestrian AEB", "Pedestrian Automatic Emergency Braking (PAEB)"],
          ["Rear cross traffic alert", "Rear Cross Traffic Alert"], ["Backup camera", "Backup Camera"],
          ["Parking assist", "Parking Assist"], ["Keyless ignition", "Keyless Ignition"],
          ["Daytime running light", "Daytime Running Light (DRL)"],
          ["Headlamp light source", "Headlamp Light Source"],
          ["Beam switching", "Semiautomatic Headlamp Beam Switching"],
          ["Adaptive driving beam", "Adaptive Driving Beam (ADB)"],
          ["Auto-reverse windows/sunroof", "Auto-Reverse System for Windows and Sunroofs"],
          ["Pedestrian alerting sound", "Automatic Pedestrian Alerting Sound (for Hybrid and EV only)"],
          ["Event data recorder", "Event Data Recorder (EDR)"],
          ["SAE automation from", "SAE Automation Level From"],
          ["SAE automation to", "SAE Automation Level To"],
          ["TPMS", "Tire Pressure Monitoring System (TPMS) Type"]
        ]
      },
      {
        title: "Plant & manufacturer",
        fields: [
          ["Manufacturer", "Manufacturer Name"], ["Plant company", "Plant Company Name"],
          ["Plant address", "Plant Address"], ["Plant city", "Plant City"],
          ["Plant state", "Plant State"], ["Plant country", "Plant Country"]
        ]
      }
    ],

    count: function () {
      return this.sections.reduce(function (total, section) {
        return total + section.fields.length;
      }, 0);
    },

    /* every schema variable name, for spotting "extra" fields a provider adds */
    keys: function () {
      var out = {};
      this.sections.forEach(function (section) {
        section.fields.forEach(function (pair) { out[pair[1]] = true; });
      });
      return out;
    }
  };
})();
