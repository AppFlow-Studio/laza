"use client"
import React from 'react'
import { EmblaOptionsType } from 'embla-carousel'
import { DotButton, useDotButton } from './emblacarouseldotbutton'
import {
    PrevButton,
    NextButton,
    usePrevNextButtons
} from './emblacarouselbuttons'
import useEmblaCarousel from 'embla-carousel-react'
import DessertCard, { Dessert } from './DessertCard'
import Image from 'next/image'

type PropType = {
    slides: Dessert[]
    options?: EmblaOptionsType
}

const EmblaCarousel: React.FC<PropType> = (props) => {
    const { slides, options } = props
    const [emblaRef, emblaApi] = useEmblaCarousel(options)

    const { selectedIndex, scrollSnaps, onDotButtonClick } =
        useDotButton(emblaApi)

    const {
        prevBtnDisabled,
        nextBtnDisabled,
        onPrevButtonClick,
        onNextButtonClick
    } = usePrevNextButtons(emblaApi)
    return (
        <section className="embla w-full ">
            <div className={"embla__viewport w-full "} ref={emblaRef}>
                <div className="embla__container h-full">
                    {slides.map((slide, index) => (
                        <div className={`embla__slide`} key={index}
                        >
                            <div
                                className={`embla__slide__number relative rounded-2xl border`}
                                >
                                {/* <DessertCard {...slide} active={index === selectedIndex} /> */}
                                {index + 1}
                                {/* <Image src={slide.image} alt={slide.title} fill /> */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="embla__controls">
                <div className="embla__buttons">
                    <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
                    <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
                </div>

                <div className="embla__dots">
                    {scrollSnaps.map((_, index) => (
                        <DotButton
                            key={index}
                            onClick={() => onDotButtonClick(index)}
                            className={'embla__dot'.concat(
                                index === selectedIndex ? ' embla__dot--selected' : ''
                            )}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default EmblaCarousel
