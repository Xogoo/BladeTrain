export const testData = [
  {
    expected: "540 Cloudy Night",
    data: [
      { name: "Grind", winner: { name: "PStar", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Inspin 540" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },
  {
    expected: "540 Hurricane Cloudy Night",
    data: [
      { name: "Grind", winner: { name: "PStar", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 540" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "Top Teakettle",
    data: [
      { name: "Grind", winner: { name: "PStar", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Rough Topside" } },
    ],
  },

  {
    expected: "AO Acid to 360 rewind out",
    data: [
      { name: "Grind", winner: { name: "Acid", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
      { name: "SpinOff", winner: { name: "Outspin 360" } },
    ],
  },

  {
    expected: "AO Soul to 360 out",
    data: [
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
      { name: "SpinOff", winner: { name: "Inspin 360" } },
    ],
  },
  {
    expected: "Soyale",
    data: [
      { name: "Grind", winner: { name: "Torque Soul" } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
    ],
  },
  {
    expected: "Kindgrind to 180 out",
    data: [
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
      { name: "SpinOff", winner: { name: "Inspin 180" } },
    ],
  },
  {
    expected: "Fullcab Kindgrind",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
    ],
  },
  {
    expected: "360 Sweatstance to 180 rewind out",
    data: [
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "Halfcab Sidewalk",
    data: [
      { name: "Grind", winner: { name: "Sidewalk", isGrooveGrind: false } },
      {
        name: "Approach",
        winner: { name: "Fakie & Natural", isFakie: true },
      },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
    ],
  },

  {
    expected: "Rough Sweatstance",
    data: [
      { name: "Grind", winner: { name: "Mizou", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Rough Topside" } },
    ],
  },

  {
    expected: "True Tough Top Acid",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Natural",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Acid", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
      { name: "GrindVariation", winner: { name: "Tough Topside" } },
    ],
  },

  {
    expected: "Fakie BS Pudslide",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Pudslide", isGrooveGrind: true } },
    ],
  },

  {
    expected: "True Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Natural",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "Halfcab Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
    ],
  },

  {
    expected: "True Halfcab Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "True Fullcab Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
    ],
  },

  {
    expected: "Grab Fishbrain",
    data: [
      { name: "Grind", winner: { name: "Makio", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Grab Topside" } },
    ],
  },
  {
    expected: "Grab Negative Makio",
    data: [
      { name: "Grind", winner: { name: "Makio", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Grab Negative" } },
    ],
  },
  {
    expected: "Zerospin Christ Negative Makio",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Makio", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Christ Negative" } },
    ],
  },

  {
    expected: "Zerospin Christ Fishbrain to 180 out",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Makio", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Christ Topside" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "AO Fishbrain to 180 rewind out",
    data: [
      { name: "Grind", winner: { name: "Makio" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "Fullcab Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
    ],
  },

  {
    expected: "360 Soul",
    data: [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
    ],
  },

  {
    expected: "360 Negative Soul to 180 rewind out",
    data: [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Negative" } },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },

  {
    expected: "Hurricane Soul",
    data: [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
    ],
  },
  {
    expected: "Stub Soul",
    data: [
      { name: "Grind", winner: { name: "X-Grind", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Negative" } },
    ],
  },
  {
    expected: "Top Stub Soul",
    data: [
      { name: "Grind", winner: { name: "X-Grind", isGrooveGrind: false } },
      { name: "GrindVariation", winner: { name: "Negative&Topside" } },
    ],
  },
  {
    expected: "True Fullcab Top Stub Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "X-Grind", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
      { name: "GrindVariation", winner: { name: "Negative&Topside" } },
    ],
  },
  {
    expected: "True Soyale to 180 out",
    data: [
      {
        name: "Grind",
        winner: { name: "Torque Soul", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },
  {
    expected: "True Fullcab Soyale to 540 rewind out",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: { name: "Torque Soul", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
      { name: "SpinOff", winner: { name: "Inspin 540" } },
    ],
  },
  {
    expected: "True Fullcab Top Soyale to 180 out",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: { name: "Torque Soul", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinOff", winner: { name: "Outspin 180" } },
    ],
  },
  {
    expected: "True Kindgrind",
    data: [
      { name: "Grind", winner: { name: "Mizou", isGrooveGrind: false } },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "True Top Teakettle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Natural",
          isFakie: false,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: { name: "PStar", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
      { name: "GrindVariation", winner: { name: "Rough Topside" } },
    ],
  },

  {
    expected: "Switch Hurricane Teakettle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Switch",
          isFakie: false,
          isSwitch: true,
        },
      },
      {
        name: "Grind",
        winner: { name: "PStar", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
      { name: "GrindVariation", winner: { name: "Rough" } },
    ],
  },
  {
    expected: "Switch AO Top Teakettle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Switch",
          isFakie: false,
          isSwitch: true,
        },
      },
      {
        name: "Grind",
        winner: { name: "PStar", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Inspin 180" } },
      { name: "GrindVariation", winner: { name: "Rough Topside" } },
    ],
  },
  {
    expected: "360 Torque Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Natural",
          isFakie: false,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: { name: "Torque Soul", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "Inspin 360" } },
    ],
  },
  {
    expected: "Switch 360 Torque Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Switch",
          isFakie: false,
          isSwitch: true,
        },
      },
      {
        name: "Grind",
        winner: { name: "Torque Soul", isGrooveGrind: false },
      },
      { name: "SpinTo", winner: { name: "360 Inspin" } },
    ],
  },

  {
    expected: "Zerospin Acid to 360 out",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Acid", isGrooveGrind: false } },
      { name: "SpinOff", winner: { name: "Outspin 360" } },
    ],
  },
  {
    expected: "Zerospin Acid to 360 out",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Acid", isGrooveGrind: false } },
      { name: "SpinOff", winner: { name: "Inspin 360" } },
    ],
  },
  {
    expected: "Fakie BS Royale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Royale", isGrooveGrind: true } },
      { name: "SpinTo", winner: { name: "Outspin 90" } },
    ],
  },
  {
    expected: "Fakie 630 BS Savannah",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Savannah", isGrooveGrind: true } },
      { name: "SpinTo", winner: { name: "Outspin 630" } },
    ],
  },
  {
    expected: "Fakie Switch 450 BS Royale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Switch",
          isFakie: true,
          isSwitch: true,
        },
      },
      { name: "Grind", winner: { name: "BS Royale", isGrooveGrind: true } },
      { name: "SpinTo", winner: { name: "Outspin 450" } },
    ],
  },
  {
    expected: "Fakie 270 BS Royale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Royale", isGrooveGrind: true } },
      { name: "SpinTo", winner: { name: "Inspin 270" } },
    ],
  },
  {
    expected: "Fakie 270 BS Royale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Royale", isGrooveGrind: true } },
      { name: "SpinTo", winner: { name: "Inspin 270" } },
      { name: "SpinOff", winner: { name: "Forwards" } },
    ],
  },
  {
    expected: "True BS Tabernacle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards & Natural",
          isFakie: false,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: {
          name: "BS Tabernacle",
          isGrooveGrind: false,
          isSoulGroove: true,
        },
      },
      { name: "SpinTo", winner: { name: "Outspin 180" } },
    ],
  },
  {
    expected: "True Fullcab BS Tabernacle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      {
        name: "Grind",
        winner: {
          name: "BS Tabernacle",
          isGrooveGrind: false,
          isSoulGroove: true,
        },
      },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
    ],
  },
  {
    expected: "Switch Zerospin BS Tabernacle",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Switch",
          isFakie: true,
          isSwitch: true,
        },
      },
      {
        name: "Grind",
        winner: {
          name: "BS Tabernacle",
          isGrooveGrind: false,
          isSoulGroove: true,
        },
      },
    ],
  },

  {
    expected: "BS Royale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "BS Royale" } },
      { name: "SpinOff", winner: { name: "Forwards" } },
    ],
  },
  {
    expected: "Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
    ],
  },
  {
    expected: "540 Hurricane Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Outspin 540" } },
    ],
  },
  {
    expected: "720 Hurricane Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Outspin 720" } },
    ],
  },

  {
    expected: "True Fullcab 720 Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Outspin 720" } },
    ],
  },
  {
    expected: "Fakie 720 Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie & Natural",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Inspin 720" } },
    ],
  },

  {
    expected: "900 Hurricane Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Outspin 900" } },
    ],
  },

  {
    expected: "Fakie 540 Top Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Inspin 540" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "540 Hurricane Top Soul",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Soul" } },
      { name: "SpinTo", winner: { name: "Outspin 540" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "True Fullcab 720 Sweatstance",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "SpinTo", winner: { name: "Outspin 720" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  //  David Sizemore (Hurricane Fish)
  {
    expected: "Hurricane Fishbrain",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Makio" } },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  // Fakie 630 Royale (Leading the Blind)
  //  David Sizemore (Hurricane Fish)
  //  Cyril Daniel (Disaster 450 Back Royale)

  {
    expected: "True Fullcab 900 Makio",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Makio" } },
      { name: "SpinTo", winner: { name: "Outspin 900" } },
    ],
  },

  {
    expected: "Zerospin Soyale",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Torque Soul" } },
    ],
  },

  {
    expected: "Zerospin Kindgrind",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "Zerospin AO Top Mistrial",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mistrial" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },
  {
    expected: "Zerospin Cloudy Night",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "PStar" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
    ],
  },

  {
    expected: "True Fullcab Kindgrind",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Fakie",
          isFakie: true,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Outspin 360" } },
    ],
  },

  {
    expected: "540 Hurricane Kindgrind",
    data: [
      {
        name: "Approach",
        winner: {
          name: "Forwards",
          isFakie: false,
          isSwitch: false,
        },
      },
      { name: "Grind", winner: { name: "Mizou" } },
      { name: "GrindVariation", winner: { name: "Topside" } },
      { name: "SpinTo", winner: { name: "Outspin 540" } },
    ],
  },

  {
    expected: "Mistrial to 180 out",
    data: [
      { name: "Grind", winner: { name: "Mistrial" } },
      { name: "SpinTo", winner: { name: "None" } },
      { name: "SpinOff", winner: { name: "Inspin 180" } },
    ],
  },
];
