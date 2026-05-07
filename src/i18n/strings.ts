export type Locale = 'en' | 'hi';

export const strings = {
  en: {
    nav: {
      home: 'Home',
      schedule: 'Schedule',
      travel: 'Travel',
      rsvp: 'RSVP',
      donations: 'Donations',
      faq: 'FAQ',
      photos: 'Photos'
    },
    footer: {
      contactPrefix: 'Questions, complaints, or marriage advice? WhatsApp us'
    },
    donations: {
      eurLabel: 'EUR (Euro)',
      usdLabel: 'USD (US Dollar)',
      inrLabel: 'INR (Indian Rupee)',
      placeholderHint: 'Transfer details to follow — please check back closer to the date.'
    },
    rsvp: {
      formTitle: 'RSVP',
      leadName: 'Your name',
      additionalGuests: 'Additional guests on this invitation',
      addGuest: 'Add another guest',
      removeGuest: 'Remove',
      day1Question: 'Will you join us for the Mehendi (26 Feb 2027)?',
      day2Question: 'Will you join us for the Wedding (27 Feb 2027)?',
      yes: 'Yes',
      no: 'No',
      dietary: 'Dietary requirements',
      dietaryOptions: {
        vegetarian: 'Vegetarian',
        vegan: 'Vegan',
        jain: 'Jain',
        halal: 'Halal',
        glutenFree: 'Gluten-free',
        nutAllergy: 'Nut allergy'
      },
      dietaryOther: 'Anything else? (allergies, sensitivities)',
      arrival: 'Arrival date and time (optional)',
      departure: 'Departure date and time (optional)',
      accommodation: 'Accommodation',
      accommodationOptions: {
        sorted: "I've sorted my own",
        recommended: "I'd like to stay at the recommended hotel",
        help: 'I need help booking'
      },
      visaQuestion: 'Will you need a visa to enter India?',
      whatsapp: 'WhatsApp number',
      whatsappPlaceholder: '+91 …',
      notes: 'Anything else?',
      submit: 'Send RSVP',
      submitting: 'Locking you in…',
      successTitle: 'Thank you!',
      successBody:
        'Got it, {name}. You\'re officially on the list. Try not to be late — Apeksha will notice. Change your answer anytime by resubmitting; we\'ll WhatsApp closer to the date.',
      errors: {
        invalid_payload: 'Please check the highlighted fields and resubmit.',
        throttled: 'Slow down — you just submitted. Try again in a few seconds.',
        network: 'Something went wrong — please try again, or message us on WhatsApp.',
        internal: 'Something went wrong — please try again, or message us on WhatsApp.',
        invalid_origin: 'Something went wrong — please try again, or message us on WhatsApp.',
        whatsappRequired: 'Please enter your WhatsApp number.',
        whatsappFormat: 'WhatsApp number should start with + and a country code.',
        leadNameRequired: 'Please enter your name.'
      }
    },
    photos: {
      placeholder: 'Photos coming soon. Check back after 27 February 2027.',
      googleHeader: 'Android & web users',
      googleHint: 'Scan with your phone camera to view and upload photos via Google Photos.',
      googleOpen: 'Open Google Photos album',
      icloudHeader: 'iPhone & iPad users',
      icloudHint: 'Scan with your iPhone camera to view photos in iCloud. Uploading requires an Apple device with the album invite accepted.',
      icloudOpen: 'Open iCloud album'
    },
    home: {
      locationDisplay: 'Gurgaon, India'
    }
  },
  hi: {
    nav: {
      home: 'मुख्य पृष्ठ',
      schedule: 'कार्यक्रम',
      travel: 'यात्रा',
      rsvp: 'जवाब दें',
      donations: 'दान',
      faq: 'सामान्य प्रश्न',
      photos: 'तस्वीरें'
    },
    footer: {
      contactPrefix: 'कोई सवाल, शिकायत, या शादी की सलाह? व्हाट्सऐप करें:'
    },
    donations: {
      eurLabel: 'EUR (यूरो)',
      usdLabel: 'USD (अमेरिकी डॉलर)',
      inrLabel: 'INR (भारतीय रुपया)',
      placeholderHint: 'ट्रांसफर विवरण जल्द ही उपलब्ध होगा — कृपया तिथि के क़रीब फिर से देखें।'
    },
    rsvp: {
      formTitle: 'RSVP — कृपया जवाब दें',
      leadName: 'आपका नाम',
      additionalGuests: 'इस निमंत्रण पर अन्य अतिथि',
      addGuest: 'एक और अतिथि जोड़ें',
      removeGuest: 'हटाएँ',
      day1Question: 'क्या आप मेहंदी (26 फ़रवरी 2027) में आएंगे?',
      day2Question: 'क्या आप शादी (27 फ़रवरी 2027) में आएंगे?',
      yes: 'हाँ',
      no: 'नहीं',
      dietary: 'भोजन संबंधी आवश्यकताएँ',
      dietaryOptions: {
        vegetarian: 'शाकाहारी',
        vegan: 'विगन',
        jain: 'जैन',
        halal: 'हलाल',
        glutenFree: 'ग्लूटेन-मुक्त',
        nutAllergy: 'नट्स से एलर्जी'
      },
      dietaryOther: 'और कुछ? (एलर्जी, संवेदनशीलताएँ)',
      arrival: 'आगमन की तिथि और समय (वैकल्पिक)',
      departure: 'प्रस्थान की तिथि और समय (वैकल्पिक)',
      accommodation: 'ठहरने की व्यवस्था',
      accommodationOptions: {
        sorted: 'मेरी अपनी व्यवस्था है',
        recommended: 'मुझे सुझाए गए होटल में रहना है',
        help: 'मुझे बुकिंग में मदद चाहिए'
      },
      visaQuestion: 'क्या आपको भारत में प्रवेश के लिए वीज़ा की आवश्यकता होगी?',
      whatsapp: 'व्हाट्सऐप नंबर',
      whatsappPlaceholder: '+91 …',
      notes: 'और कुछ?',
      submit: 'RSVP भेजें',
      submitting: 'आपकी कुर्सी पक्की कर रहे हैं…',
      successTitle: 'धन्यवाद!',
      successBody:
        'मिल गया, {name}। आप आधिकारिक तौर पर सूची में हैं। देर मत करना — अपेक्षा देख लेगी। कुछ बदलना हो तो फिर से भेज दीजिए; शादी के क़रीब व्हाट्सऐप पर संपर्क करेंगे।',
      errors: {
        invalid_payload: 'कृपया चिह्नित फ़ील्ड जाँचें और फिर से भेजें।',
        throttled: 'धीरे-धीरे — आपने अभी-अभी भेजा है। कुछ सेकंड बाद फिर कोशिश करें।',
        network: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        internal: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        invalid_origin: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        whatsappRequired: 'कृपया अपना व्हाट्सऐप नंबर दर्ज करें।',
        whatsappFormat: 'व्हाट्सऐप नंबर + और देश-कोड से शुरू होना चाहिए।',
        leadNameRequired: 'कृपया अपना नाम दर्ज करें।'
      }
    },
    photos: {
      placeholder: 'तस्वीरें जल्द आएँगी। 27 फ़रवरी 2027 के बाद ज़रूर देखें।',
      googleHeader: 'Android और वेब उपयोगकर्ता',
      googleHint: 'अपने फ़ोन के कैमरे से स्कैन करें और Google Photos में तस्वीरें देखें या अपलोड करें।',
      googleOpen: 'Google Photos एल्बम खोलें',
      icloudHeader: 'iPhone और iPad उपयोगकर्ता',
      icloudHint: 'अपने iPhone के कैमरे से स्कैन करें और iCloud में तस्वीरें देखें। अपलोड करने के लिए Apple डिवाइस और एल्बम का निमंत्रण आवश्यक है।',
      icloudOpen: 'iCloud एल्बम खोलें'
    },
    home: {
      locationDisplay: 'गुड़गांव, भारत'
    }
  }
} as const;

export type Strings = (typeof strings)[Locale];

export function t(lang: Locale): Strings {
  return strings[lang];
}
