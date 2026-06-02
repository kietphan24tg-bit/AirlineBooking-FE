import MarketingNav from '../components/layout/MarketingNav';
import SiteFooter from '../components/layout/SiteFooter';

export default function Experience() {
  return (
    <div className="flex min-h-screen flex-col bg-white/10 font-body text-on-surface">
      <MarketingNav active="experience" />
      <main className="relative space-y-10">
        <section className="flex justify-start items-center flex-col relative h-120 w-full">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img alt="" src="/src/assets/plane2.jpg" className="w-full -mt-110" />
          </div>
          <div className="relative flex justify-start items-center flex-col mt-50">
            <p className="text-xl uppercase tracking-wider text-center text-white">
              THE SOVEREIGN EXPERIENCE
            </p>
            <h1 className="text-6xl font-extrabold mb-4 text-center text-white">
              Your journey starts here
            </h1>
            <p className="text-center text-lg text-muted-foreground text-white">
              Fly Better with us for more comfort, delicious cuisine <br /> and award-winning
              entertainment
            </p>
          </div>
        </section>

        <section className="relative flex justify-end items-center flex-row h-200 w-full p-15">
          <div className="relative inset-0 z-0 overflow-hidden rounded-4xl shadow-2xl">
            <img
              alt=""
              src="https://i.pinimg.com/1200x/f2/8b/96/f28b967efa8b2189af7d962d69f8c199.jpg"
            />
          </div>
          <div className="absolute top-50 left-20 hidden w-180 rounded-xl  bg-white p-8 shadow-xl lg:block">
            <p className="mb-2 font-headline text-5xl font-semibold text-midnight-burgundy">
              Enjoy fine dining at 40,000ft
            </p>
            <div className="h-px w-50 bg-luxury-gold mb-1" />
            <p className="font-thin text-on-surface-variant text-xl">
              Whether you&apos;re on a short or long haul flight, expect your meals to be served on
              Royal Doulton fine bone china along with cutlery exclusively made by Robert Welch.
            </p>
          </div>
        </section>

        <section className="relative flex justify-start items-center flex-row h-200 w-full p-15 mb-50">
          <div className="relative inset-0 z-0 overflow-hidden rounded-4xl shadow-2xl">
            <img
              alt=""
              src="https://i.pinimg.com/1200x/ac/81/eb/ac81eb0e2469a8355f0c0744396e9972.jpg"
            />
          </div>
          <div className="absolute bottom-50 right-20 hidden w-180 rounded-xl  bg-white p-8 shadow-xl lg:block">
            <p className="mb-2 font-headline text-5xl font-semibold text-midnight-burgundy">
              Inflight airshow
            </p>
            <div className="h-px w-50 bg-luxury-gold mb-1" />
            <p className="font-thin text-on-surface-variant text-xl">
              Follow your flight&apos;s progress on our moving map, and see the world from 40,000ft
              with our external cameras. Get weather, news and sport reports and information about
              your flight to your screen. You can listen to your music, radio or podcasts
              uninterrupted while you explore.
            </p>
          </div>
        </section>

        <section className="relative flex justify-center items-center flex-row h-200 w-full p-15 mb-50">
          <div className="relative inset-0 z-0 overflow-hidden rounded-4xl shadow-2xl w-350">
            <img
              alt=""
              src="https://cdn.pixabay.com/photo/2017/08/10/08/46/airplane-2620112_1280.jpg"
              className="w-full"
            />
          </div>
          <div className="absolute top-50 hidden w-100 rounded-xl p-8 lg:block items-center -ml-5">
            <p className="mb-2 font-headline text-6xl font-semibold text-white text-center w-90 text-shadow-cyan-200 text-shadow-2xs">
              Fly more <br /> Save more
            </p>
            <div className="h-px w-40 bg-white mb-5 mx-auto" />
            <p className="font-thin text-cyan-900 text-sm w-100">
              -Turn every trip into a smarter, more affordable adventure.
              <br />
              -Explore the world without worrying about the cost.
              <br />
              -More destinations, better prices, unforgettable journeys.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
