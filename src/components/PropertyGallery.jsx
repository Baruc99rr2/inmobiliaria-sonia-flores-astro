import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Controller, Thumbs } from 'swiper/modules';
import { IoMdClose } from 'react-icons/io';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';

const PropertyGallery = ({ images }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Slider Principal */}
      <Swiper
        modules={[Navigation, Controller, Thumbs]}
        thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
        slidesPerView={1}
        loop={true}
        navigation={true}
        className="w-full h-[400px] bg-black rounded-lg cursor-pointer mb-4"
        onClick={() => setIsOpen(true)}
      >
        {images.map((img, i) => (
          <SwiperSlide key={i} className="flex justify-center items-center">
            <img src={img} className="h-full w-full object-contain" alt={`Propiedad ${i}`} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Miniaturas (Guía visual) */}
      <Swiper
        onSwiper={setThumbsSwiper}
        modules={[Controller, Thumbs]}
        slidesPerView="auto"
        spaceBetween={10}
        watchSlidesProgress={true}
        className="h-[100px] w-full"
      >
        {images.map((img, i) => (
          <SwiperSlide key={i} className="!w-[100px] cursor-pointer opacity-40 [&.swiper-slide-thumb-active]:opacity-100 transition-opacity">
            <img src={img} className="h-full w-full object-cover rounded-lg border-2 border-transparent [&.swiper-slide-thumb-active]:border-white" />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Lightbox a pantalla completa */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
          <button onClick={() => setIsOpen(false)} className="absolute top-5 right-5 text-white text-4xl z-50">
            <IoMdClose />
          </button>
          <Swiper modules={[Navigation]} navigation={true} className="w-full max-w-5xl h-[80vh]">
            {images.map((img, i) => (
              <SwiperSlide key={i} className="flex items-center justify-center">
                <img src={img} className="max-h-full max-w-full object-contain" />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;