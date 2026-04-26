import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { events } from "@/lib/constants";



const page = () => {
  return (
    <section>
      <h1 className="text-center">
        The hub for every developer
        <br /> You cant miss{" "}
      </h1>
      <p className="text-center mt-5">HAckathons , meetups, and more!</p>

      <ExploreBtn />
      <div className="mt-20 space-y-7">
        <h3>Featured events</h3>

        <ul className="events">
          {[
            events.map((event) => (
              <li key={event.title}>
                <EventCard title={event.title} image={event.image} />
              </li>
            )),
          ]}
        </ul>
      </div>
    </section>
  );
};

export default page;
